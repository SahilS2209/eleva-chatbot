from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from app.models.conversation import MessageCreate, MessageRole
from app.database import conversations_collection, messages_collection, db
from app.services.agent_service import get_chat_response
from datetime import datetime
from bson import ObjectId
from typing import Dict, List
import json
import time

response_times_collection = db["response_times"]

router = APIRouter(prefix="/api/chat", tags=["Chat"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, conversation_id: str):
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = []
        self.active_connections[conversation_id].append(websocket)

    def disconnect(self, websocket: WebSocket, conversation_id: str):
        if conversation_id in self.active_connections:
            self.active_connections[conversation_id].remove(websocket)
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

    async def send_message(self, message: dict, conversation_id: str):
        if conversation_id in self.active_connections:
            for connection in self.active_connections[conversation_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass


manager = ConnectionManager()


@router.post("/{conversation_id}/message")
async def send_message(conversation_id: str, message_data: MessageCreate):
    """Send a message and get AI response (REST endpoint)."""
    # Verify conversation exists
    conv = await conversations_collection.find_one({"_id": ObjectId(conversation_id)})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Check if conversation is escalated
    if conv.get("status") == "escalated":
        # Still save the user's message so the agent can see it
        user_msg = {
            "conversation_id": conversation_id,
            "role": MessageRole.USER.value,
            "content": message_data.content,
            "timestamp": datetime.utcnow(),
            "metadata": None,
        }
        await messages_collection.insert_one(user_msg)
        return {
            "response": "",
            "status": "escalated"
        }

    # Save user message
    user_msg = {
        "conversation_id": conversation_id,
        "role": MessageRole.USER.value,
        "content": message_data.content,
        "timestamp": datetime.utcnow(),
        "metadata": None,
    }
    await messages_collection.insert_one(user_msg)

    # Get conversation history
    history = []
    cursor = messages_collection.find(
        {"conversation_id": conversation_id}
    ).sort("timestamp", 1)
    async for msg in cursor:
        history.append({"role": msg["role"], "content": msg["content"]})

    # Get AI response
    start_time = time.time()
    ai_response = await get_chat_response(
        message=message_data.content,
        conversation_id=conversation_id,
        conversation_history=history[:-1],  # Exclude the message we just added
    )
    response_time_ms = round((time.time() - start_time) * 1000)

    # Track response time
    await response_times_collection.insert_one({
        "conversation_id": conversation_id,
        "response_time_ms": response_time_ms,
        "timestamp": datetime.utcnow(),
    })

    # Save AI response
    ai_msg = {
        "conversation_id": conversation_id,
        "role": MessageRole.ASSISTANT.value,
        "content": ai_response,
        "timestamp": datetime.utcnow(),
        "metadata": None,
    }
    await messages_collection.insert_one(ai_msg)

    # Update conversation timestamp
    await conversations_collection.update_one(
        {"_id": ObjectId(conversation_id)},
        {"$set": {"updated_at": datetime.utcnow()}}
    )

    # Notify WebSocket clients
    await manager.send_message({
        "type": "new_message",
        "message": {
            "role": "assistant",
            "content": ai_response,
            "timestamp": datetime.utcnow().isoformat(),
        }
    }, conversation_id)

    # Re-fetch conversation to get updated status (AI may have escalated)
    updated_conv = await conversations_collection.find_one({"_id": ObjectId(conversation_id)})
    current_status = updated_conv.get("status", "active") if updated_conv else "active"

    return {"response": ai_response, "status": current_status}


@router.post("/{conversation_id}/agent-message")
async def send_agent_message(conversation_id: str, message_data: MessageCreate):
    """Send a message from a human agent."""
    conv = await conversations_collection.find_one({"_id": ObjectId(conversation_id)})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Mark conversation as having human agent involvement
    if not conv.get("assigned_agent_id"):
        await conversations_collection.update_one(
            {"_id": ObjectId(conversation_id)},
            {"$set": {"assigned_agent_id": "human_agent", "updated_at": datetime.utcnow()}}
        )

    # Save agent message
    agent_msg = {
        "conversation_id": conversation_id,
        "role": MessageRole.AGENT.value,
        "content": message_data.content,
        "timestamp": datetime.utcnow(),
        "metadata": None,
    }
    await messages_collection.insert_one(agent_msg)

    # Notify WebSocket clients
    await manager.send_message({
        "type": "new_message",
        "message": {
            "role": "agent",
            "content": message_data.content,
            "timestamp": datetime.utcnow().isoformat(),
        }
    }, conversation_id)

    return {"message": "Agent message sent"}


@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(websocket: WebSocket, conversation_id: str):
    """WebSocket endpoint for real-time chat."""
    await manager.connect(websocket, conversation_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "user_message":
                content = message.get("content", "")

                # Save user message
                user_msg = {
                    "conversation_id": conversation_id,
                    "role": MessageRole.USER.value,
                    "content": content,
                    "timestamp": datetime.utcnow(),
                    "metadata": None,
                }
                await messages_collection.insert_one(user_msg)

                # Send typing indicator
                await manager.send_message({
                    "type": "typing",
                    "is_typing": True,
                }, conversation_id)

                # Get conversation history
                history = []
                cursor = messages_collection.find(
                    {"conversation_id": conversation_id}
                ).sort("timestamp", 1)
                async for msg in cursor:
                    history.append({"role": msg["role"], "content": msg["content"]})

                # Get AI response
                ai_response = await get_chat_response(
                    message=content,
                    conversation_id=conversation_id,
                    conversation_history=history[:-1],
                )

                # Save AI response
                ai_msg = {
                    "conversation_id": conversation_id,
                    "role": MessageRole.ASSISTANT.value,
                    "content": ai_response,
                    "timestamp": datetime.utcnow(),
                    "metadata": None,
                }
                await messages_collection.insert_one(ai_msg)

                # Send response
                await manager.send_message({
                    "type": "typing",
                    "is_typing": False,
                }, conversation_id)

                await manager.send_message({
                    "type": "new_message",
                    "message": {
                        "role": "assistant",
                        "content": ai_response,
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                }, conversation_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, conversation_id)
