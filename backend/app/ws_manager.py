"""In-memory WebSocket hub for live order updates (scale-out: use Redis pub/sub)."""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, List

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.append(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self._connections:
                self._connections.remove(websocket)

    async def broadcast(self, payload: dict[str, Any]) -> None:
        dead: List[WebSocket] = []
        async with self._lock:
            conns = list(self._connections)
        for ws in conns:
            try:
                await ws.send_text(json.dumps(payload))
            except Exception as e:  # noqa: BLE001
                logger.debug("ws send failed: %s", e)
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)


order_events = ConnectionManager()
