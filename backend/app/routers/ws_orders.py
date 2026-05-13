from __future__ import annotations

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect

from app.ws_manager import order_events

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/orders")
async def orders_ws(websocket: WebSocket):
    await order_events.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await order_events.disconnect(websocket)
