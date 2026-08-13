import logging
from typing import Any

import jwt as pyjwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.auth.jwt import decode_token
from app.models.user import UserRole
from app.websocket.manager import ws_manager

logger = logging.getLogger("uvicorn.error")
router = APIRouter()


def resolve_role(token: str | None) -> tuple[str, dict[str, Any]]:
    """Extract role from a JWT token, or fall back to REQUESTER."""
    if token:
        try:
            payload = decode_token(token)
            role = payload.get("role")
            if role in UserRole.__members__:
                return role, {"user_id": payload.get("sub")}
        except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
            logger.warning("WS auth token invalid, defaulting to REQUESTER role")
    return UserRole.REQUESTER.value, {}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None) -> None:
    role, meta = resolve_role(token)
    await ws_manager.connect(websocket, role, meta)
    await ws_manager.send_to_socket(
        websocket,
        {"event": "connection.status", "data": {"connected": True, "role": role}},
    )
    try:
        while True:
            raw = await websocket.receive_json()
            # Support post-connect token authentication (used by team app).
            if isinstance(raw, dict) and raw.get("type") == "auth":
                new_role, new_meta = resolve_role(raw.get("token"))
                if new_role != role:
                    ws_manager.disconnect(websocket, role)
                    role, meta = new_role, new_meta
                    await ws_manager.connect(websocket, role, meta)
                continue
            # Echo acknowledgement for client-published events (non-blocking).
            if isinstance(raw, dict) and raw.get("type") == "echo":
                await ws_manager.send_to_socket(websocket, raw)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, role)
    except Exception as exc:  # pragma: no cover - defensive cleanup
        logger.warning("WS error: %s", exc)
        ws_manager.disconnect(websocket, role)