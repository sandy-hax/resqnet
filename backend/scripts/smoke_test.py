#!/usr/bin/env python3
"""End-to-end sanity test for the Disaster Management System backend.

Runs the complete SOS lifecycle (submit -> verify -> assign -> accept ->
on-the-way -> arrived -> completed), content/alerts/shelters endpoints and a
live WebSocket broadcast check against a running server.

Usage:
    python scripts/smoke_test.py [--base-url http://localhost:8000]
"""

import argparse
import asyncio
import json
import sys

import httpx
import websockets

BASE = "http://localhost:8000"
WS_BASE = "ws://localhost:8000"

PASS = 0
FAIL = 0


def report(name: str, ok: bool, extra: str = "") -> None:
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name} {extra}")


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=BASE)
    args = parser.parse_args()
    base = args.base_url.rstrip("/")
    api = f"{base}/api/v1"

    async with httpx.AsyncClient(timeout=10) as client:
        print("== Health ==")
        r = await client.get(f"{base}/health")
        report("GET /health", r.status_code == 200 and r.json().get("status") == "ok", str(r.text))

        print("== Auth ==")
        r = await client.post(f"{api}/auth/login", json={"phone": "+911234567890", "password": "authority123"})
        report("Authority login", r.status_code == 200, str(r.text))
        authority_token = r.json()["access_token"]
        auth_h = {"Authorization": f"Bearer {authority_token}"}

        r = await client.post(f"{api}/auth/login", json={"phone": "+919123456789", "password": "team123"})
        report("Team login", r.status_code == 200, str(r.text))
        team_token = r.json()["access_token"]
        team_h = {"Authorization": f"Bearer {team_token}"}
        team_id = r.json()["user_id"]

        r = await client.post(f"{api}/auth/login", json={"phone": "+919876543210", "password": "citizen123"})
        report("Requester login", r.status_code == 200, str(r.text))
        requester_token = r.json()["access_token"]
        requester_h = {"Authorization": f"Bearer {requester_token}"}

        print("== SOS Lifecycle ==")
        sos_payload = {
            "emergency_type": "FLOOD",
            "description": "Water level rising rapidly. 3 people stuck on roof including elderly person.",
            "people_affected": 3,
            "lat": 11.3410,
            "lng": 77.7172,
        }
        r = await client.post(f"{api}/sos", json=sos_payload, headers=requester_h)
        report("Requester creates SOS", r.status_code == 201, str(r.text))
        sos = r.json()
        sos_id = sos["sos_id"]
        report("SOS id formatted (SOS-%06d)", sos_id.startswith("SOS-"), sos_id)
        report("SOS initial status SUBMITTED", sos["status"] == "SUBMITTED", str(sos["status"]))

        r = await client.get(f"{api}/sos/my", headers=requester_h)
        report("Requester GET /sos/my", r.status_code == 200 and any(s["sos_id"] == sos_id for s in r.json()))

        r = await client.get(f"{api}/sos", headers=auth_h)
        report("Authority GET /sos (queue)", r.status_code == 200 and any(s["sos_id"] == sos_id for s in r.json()))

        r = await client.patch(f"{api}/sos/{sos_id}/verify", json={"verified": True, "priority": "HIGH"}, headers=auth_h)
        report("Authority verifies SOS -> VERIFIED", r.status_code == 200 and r.json()["status"] == "VERIFIED", str(r.text))

        r = await client.get(f"{api}/teams/nearby", params={"lat": 11.3410, "lng": 77.7172, "skill": "FLOOD_RESCUE"}, headers=auth_h)
        report("Authority GET /teams/nearby ranked", r.status_code == 200 and len(r.json()) > 0, str(r.text))
        ranked = r.json()
        first_team_id = ranked[0]["team_id"]
        report("Nearby teams sorted by skill/distance", ranked[0]["has_matching_skill"] is True)

        r = await client.post(f"{api}/sos/{sos_id}/assign", json={"team_id": first_team_id}, headers=auth_h)
        report("Authority assigns team -> SOS ASSIGNED", r.status_code == 201 and r.json()["status"] == "ASSIGNED", str(r.text))
        assignment_id = r.json()["assigned_team"]

        r = await client.get(f"{api}/assignments/mine", headers=team_h)
        report("Team GET /assignments/mine", r.status_code == 200 and len(r.json()) > 0, str(r.text))
        assignment = next((a for a in r.json() if a["sos_id"] == sos_id), None)
        report("Assignment offered to team", assignment is not None and assignment["status"] == "OFFERED")
        assignment_id = assignment["assignment_id"]

        r = await client.patch(f"{api}/assignments/{assignment_id}/respond", json={"status": "ACCEPTED"}, headers=team_h)
        report("Team accepts offer -> ACCEPTED", r.status_code == 200 and r.json()["status"] == "ACCEPTED", str(r.text))

        r = await client.patch(f"{api}/assignments/{assignment_id}/status", json={"status": "ON_THE_WAY"}, headers=team_h)
        report("Team ON_THE_WAY", r.status_code == 200 and r.json()["status"] == "ON_THE_WAY")
        r = await client.get(f"{api}/sos/{sos_id}")
        report("SOS synced -> RESPONDER_ON_WAY", r.json()["status"] == "RESPONDER_ON_WAY", str(r.json()["status"]))

        r = await client.patch(f"{api}/assignments/{assignment_id}/status", json={"status": "ARRIVED"}, headers=team_h)
        report("Team ARRIVED", r.status_code == 200 and r.json()["status"] == "ARRIVED")
        r = await client.get(f"{api}/sos/{sos_id}")
        report("SOS synced -> ASSISTANCE_PROVIDED", r.json()["status"] == "ASSISTANCE_PROVIDED", str(r.json()["status"]))

        r = await client.patch(f"{api}/assignments/{assignment_id}/status", json={"status": "COMPLETED"}, headers=team_h)
        report("Team COMPLETED", r.status_code == 200 and r.json()["status"] == "COMPLETED")
        r = await client.get(f"{api}/sos/{sos_id}")
        report("SOS synced -> RESOLVED", r.json()["status"] == "RESOLVED", str(r.json()["status"]))

        print("== Routing ==")
        r = await client.get(f"{api}/sos/{sos_id}/route", params={"from_lat": 11.3445, "from_lng": 77.7210})
        report("GET /sos/{id}/route", r.status_code == 200, str(r.text))
        route = r.json()
        report("Route has distance & duration", "distance_km" in route and "duration_min" in route)
        report("Route has polyline coordinates", isinstance(route["polyline"], list) and len(route["polyline"]) >= 1)

        print("== Team availability ==")
        r = await client.patch(f"{api}/team/availability", json={"is_available": True, "current_lat": 11.3445, "current_lng": 77.7210}, headers=team_h)
        report("PATCH /team/availability", r.status_code == 200 and r.json()["is_available"] is True, str(r.text))
        r = await client.patch(f"{api}/team/location", json={"lat": 11.35, "lng": 77.72}, headers=team_h)
        report("PATCH /team/location", r.status_code == 200 and r.json()["current_lat"] == 11.35, str(r.text))

        print("== Content, Alerts & Shelters ==")
        r = await client.post(f"{api}/content/awareness", json={"disaster_type": "FLOOD", "title": "Smoke Test Awareness", "body": "Stay safe during floods."}, headers=auth_h)
        report("POST /content/awareness", r.status_code == 201 and r.json()["is_program"] is False, str(r.text))

        ws_events: list[dict] = []

        async def collect_ws() -> None:
            try:
                async with websockets.connect(f"{WS_BASE}/ws") as ws:
                    while True:
                        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
                        if msg.get("event") in ("connection.status", "content.published", "alert.broadcast", "sos.status_changed"):
                            ws_events.append(msg)
                        if msg.get("event") == "content.published":
                            break
            except Exception:
                pass

        ws_task = asyncio.create_task(collect_ws())
        await asyncio.sleep(0.5)
        r = await client.post(f"{api}/content/preparedness", json={"disaster_type": "CYCLONE", "title": "Cyclone Drill", "body": "Register household for cyclone kit.", "target_area": "Coastal Belt", "is_program": True}, headers=auth_h)
        report("POST /content/preparedness", r.status_code == 201 and r.json()["is_program"] is True, str(r.text))
        await asyncio.wait_for(ws_task, timeout=6)
        report("WebSocket content.published broadcast to citizen", any(e.get("event") == "content.published" for e in ws_events), str(ws_events))

        r = await client.get(f"{api}/content")
        report("GET /content (seeded + created)", r.status_code == 200 and len(r.json()) >= 6, f"count={len(r.json())}")

        r = await client.post(f"{api}/alerts", json={"title": "Smoke Test Alert", "message": "Heavy rain warning.", "severity": "HIGH", "target_area": "River Basin"}, headers=auth_h)
        report("POST /alerts", r.status_code == 201, str(r.text))

        r = await client.get(f"{api}/shelters", params={"lat": 11.3410, "lng": 77.7172})
        report("GET /shelters", r.status_code == 200 and len(r.json()) >= 3, f"count={len(r.json())}")
        if r.status_code == 200 and r.json():
            report("Shelters include distance_km", "distance_km" in r.json()[0])

        print("== Access control ==")
        r = await client.get(f"{api}/sos", headers=team_h)
        report("Team forbidden from authority queue", r.status_code == 403, str(r.status_code))
        r = await client.patch(f"{api}/sos/{sos_id}/verify", json={"verified": True}, headers=team_h)
        report("Team forbidden from verify", r.status_code == 403, str(r.status_code))
        r = await client.get(f"{api}/sos", headers=requester_h)
        report("Requester forbidden from authority queue", r.status_code == 403, str(r.status_code))

    print(f"\n== RESULT: {PASS} passed, {FAIL} failed ==")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
