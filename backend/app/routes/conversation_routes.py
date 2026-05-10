from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.conversation import (
    ConversationResponse, ConversationStatus
)
from app.database import conversations_collection, messages_collection
from app.auth import get_current_user, require_agent_or_admin
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


@router.post("", response_model=dict)
async def create_conversation(user_name: Optional[str] = "Anonymous"):
    """Create a new conversation (public - for customers)."""
    conversation_doc = {
        "user_name": user_name,
        "status": ConversationStatus.ACTIVE.value,
        "assigned_agent_id": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "summary": None,
        "tags": [],
    }
    result = await conversations_collection.insert_one(conversation_doc)
    return {"id": str(result.inserted_id), "status": "active"}


@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    status: Optional[ConversationStatus] = None,
    limit: int = Query(default=10, le=50),
    skip: int = 0,
    current_user: dict = Depends(require_agent_or_admin),
):
    """List conversations (agents/admins only)."""
    query = {}
    if status:
        query["status"] = status.value

    cursor = conversations_collection.find(query).sort("updated_at", -1).skip(skip).limit(limit)
    conversations = []

    async for conv in cursor:
        conversations.append(ConversationResponse(
            id=str(conv["_id"]),
            user_name=conv.get("user_name"),
            status=ConversationStatus(conv["status"]),
            assigned_agent_id=conv.get("assigned_agent_id"),
            created_at=conv["created_at"],
            updated_at=conv["updated_at"],
            summary=conv.get("summary"),
            message_count=0,
            last_message=None,
        ))

    return conversations


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get conversation with messages."""
    conv = await conversations_collection.find_one({"_id": ObjectId(conversation_id)})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Get messages
    messages = []
    cursor = messages_collection.find({"conversation_id": conversation_id}).sort("timestamp", 1)
    async for msg in cursor:
        messages.append({
            "id": str(msg["_id"]),
            "role": msg["role"],
            "content": msg["content"],
            "timestamp": msg["timestamp"].isoformat(),
            "metadata": msg.get("metadata"),
        })

    return {
        "id": str(conv["_id"]),
        "user_name": conv.get("user_name"),
        "status": conv["status"],
        "assigned_agent_id": conv.get("assigned_agent_id"),
        "created_at": conv["created_at"].isoformat(),
        "updated_at": conv["updated_at"].isoformat(),
        "summary": conv.get("summary"),
        "messages": messages,
    }


@router.patch("/{conversation_id}/escalate")
async def escalate_conversation(conversation_id: str):
    """Escalate conversation to human agent."""
    result = await conversations_collection.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$set": {
                "status": ConversationStatus.ESCALATED.value,
                "updated_at": datetime.utcnow(),
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation escalated to human agent"}


@router.patch("/{conversation_id}/assign")
async def assign_conversation(
    conversation_id: str,
    agent_id: str,
    current_user: dict = Depends(require_agent_or_admin),
):
    """Assign conversation to an agent."""
    result = await conversations_collection.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$set": {
                "assigned_agent_id": agent_id,
                "updated_at": datetime.utcnow(),
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": f"Conversation assigned to agent {agent_id}"}


@router.patch("/{conversation_id}/resolve")
async def resolve_conversation(
    conversation_id: str,
    current_user: dict = Depends(require_agent_or_admin),
):
    """Resolve a conversation (agent/admin)."""
    result = await conversations_collection.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$set": {
                "status": ConversationStatus.RESOLVED.value,
                "updated_at": datetime.utcnow(),
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation resolved"}


@router.patch("/{conversation_id}/end")
async def end_conversation(conversation_id: str):
    """End a conversation (public - for customers)."""
    conv = await conversations_collection.find_one({"_id": ObjectId(conversation_id)})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Add system message so agent sees it
    await messages_collection.insert_one({
        "conversation_id": conversation_id,
        "role": "system",
        "content": "Customer has ended the chat.",
        "timestamp": datetime.utcnow(),
        "metadata": None,
    })

    # Mark as resolved
    await conversations_collection.update_one(
        {"_id": ObjectId(conversation_id)},
        {
            "$set": {
                "status": ConversationStatus.RESOLVED.value,
                "updated_at": datetime.utcnow(),
            }
        }
    )
    return {"message": "Conversation ended"}
