from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class TicketCreate(BaseModel):
    title: str
    description: str
    priority: TicketPriority = TicketPriority.MEDIUM
    conversation_id: Optional[str] = None
    customer_email: Optional[str] = None


class Ticket(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    priority: TicketPriority = TicketPriority.MEDIUM
    status: TicketStatus = TicketStatus.OPEN
    conversation_id: Optional[str] = None
    customer_email: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None


class TicketResponse(BaseModel):
    id: str
    title: str
    description: str
    priority: TicketPriority
    status: TicketStatus
    conversation_id: Optional[str]
    customer_email: Optional[str]
    assigned_agent_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
