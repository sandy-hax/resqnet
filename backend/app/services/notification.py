from app.models.user import UserRole
from app.websocket.manager import ws_manager


async def broadcast_regional_program(content_data: dict, target_area: str) -> None:
    """Broadcast a newly published Awareness/Preparedness program to all citizens."""
    payload = {
        "event": "content.published",
        "data": {
            "content_id": content_data.get("content_id"),
            "title": content_data.get("title"),
            "body": content_data.get("body"),
            "media_url": content_data.get("media_url"),
            "target_area": target_area,
            "is_program": content_data.get("is_program", False),
            "message": (
                f"New official preparedness program published for "
                f"{target_area} and neighboring districts."
            ),
        },
    }
    await ws_manager.broadcast_to_role(UserRole.REQUESTER.value, payload)


async def broadcast_alert(alert_data: dict) -> None:
    """Broadcast an authority alert to citizens and team sockets."""
    payload = {
        "event": "alert.broadcast",
        "data": {
            "id": str(alert_data.get("alert_id")),
            "title": alert_data.get("title"),
            "message": alert_data.get("message"),
            "severity": alert_data.get("severity"),
            "target_area": alert_data.get("target_area"),
            "timestamp": alert_data.get("created_at"),
        },
    }
    await ws_manager.broadcast_to_role(UserRole.REQUESTER.value, payload)
