from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ConversationStatus(str, Enum):
    ACTIVE = "active"
    ESCALATED = "escalated"
    RESOLVED = "resolved"
    CLOSED = "closed"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    AGENT = "agent"


class Message(BaseModel):
    id: Optional[str] = None
    conversation_id: str
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[dict] = None


class MessageCreate(BaseModel):
    content: str


class Conversation(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = "Anonymous"
    status: ConversationStatus = ConversationStatus.ACTIVE
    assigned_agent_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    summary: Optional[str] = None
    tags: List[str] = []


class ConversationResponse(BaseModel):
    id: str
    user_name: Optional[str]
    status: ConversationStatus
    assigned_agent_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    summary: Optional[str]
    message_count: int = 0
    last_message: Optional[str] = None
