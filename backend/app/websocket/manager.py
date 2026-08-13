from collections import defaultdict
from typing import Any

from fastapi import WebSocket

from app.models.user import UserRole


class ConnectionManager:
    """Manages active WebSocket connections grouped by role.

    Each socket is keyed by its role so that broadcasts can be targeted to
    citizens (REQUESTER), responder teams (DISASTER_MGMT_TEAM) or the
    command center (AUTHORITY).
    """

    def __init__(self) -> None:
        self.active_connections: dict[str, list[WebSocket]] = defaultdict(list)
        # role -> WebSocket -> (user_id, role) metadata
        self.connection_meta: dict[str, dict[int, dict[str, Any]]] = defaultdict(dict)

    async def connect(self, websocket: WebSocket, role: str, meta: dict[str, Any] | None = None) -> None:
        await websocket.accept()
        role = role if role in UserRole.__members__ else UserRole.REQUESTER.value
        self.active_connections[role].append(websocket)
        self.connection_meta[role][id(websocket)] = meta or {}

    def disconnect(self, websocket: WebSocket, role: str) -> None:
        if role in self.active_connections and websocket in self.active_connections[role]:
            self.active_connections[role].remove(websocket)
        if role in self.connection_meta:
            self.connection_meta[role].pop(id(websocket), None)

    async def send_to_socket(self, websocket: WebSocket, message: dict) -> None:
        try:
            await websocket.send_json(message)
        except Exception:
            pass

    async def broadcast_to_role(self, role: str, message: dict) -> None:
        for connection in list(self.active_connections.get(role, [])):
            await self.send_to_socket(connection, message)

    async def broadcast_event(self, event_name: str, data: dict, roles: list[str] | None = None) -> None:
        """Broadcast a normalized {event, data} payload to all (or selected) roles."""
        payload: dict[str, Any] = {"event": event_name, "data": data}
        target_roles = roles or list(self.active_connections.keys())
        for role in target_roles:
            await self.broadcast_to_role(role, payload)


ws_manager = ConnectionManager()
