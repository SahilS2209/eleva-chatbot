from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from app.models.ticket import (
    TicketCreate, TicketResponse, TicketStatus, TicketPriority
)
from app.database import tickets_collection
from app.auth import require_agent_or_admin
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])


@router.post("", response_model=TicketResponse)
async def create_ticket(ticket_data: TicketCreate):
    """Create a new support ticket."""
    ticket_doc = {
        "title": ticket_data.title,
        "description": ticket_data.description,
        "priority": ticket_data.priority.value,
        "status": TicketStatus.OPEN.value,
        "conversation_id": ticket_data.conversation_id,
        "customer_email": ticket_data.customer_email,
        "assigned_agent_id": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "resolved_at": None,
    }

    result = await tickets_collection.insert_one(ticket_doc)
    ticket_doc["id"] = str(result.inserted_id)
    return TicketResponse(**ticket_doc)


@router.get("", response_model=List[TicketResponse])
async def list_tickets(
    status: Optional[TicketStatus] = None,
    priority: Optional[TicketPriority] = None,
    limit: int = Query(default=50, le=100),
    skip: int = 0,
    current_user: dict = Depends(require_agent_or_admin),
):
    """List tickets (agents/admins only)."""
    query = {}
    if status:
        query["status"] = status.value
    if priority:
        query["priority"] = priority.value

    cursor = tickets_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
    tickets = []

    async for ticket in cursor:
        ticket["id"] = str(ticket["_id"])
        tickets.append(TicketResponse(**ticket))

    return tickets


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: str, current_user: dict = Depends(require_agent_or_admin)):
    """Get a specific ticket."""
    ticket = await tickets_collection.find_one({"_id": ObjectId(ticket_id)})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket["id"] = str(ticket["_id"])
    return TicketResponse(**ticket)


@router.patch("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    new_status: TicketStatus,
    current_user: dict = Depends(require_agent_or_admin),
):
    """Update ticket status."""
    update_data = {
        "status": new_status.value,
        "updated_at": datetime.utcnow(),
    }
    if new_status == TicketStatus.RESOLVED:
        update_data["resolved_at"] = datetime.utcnow()

    result = await tickets_collection.update_one(
        {"_id": ObjectId(ticket_id)},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": f"Ticket status updated to {new_status.value}"}


@router.patch("/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    agent_id: str,
    current_user: dict = Depends(require_agent_or_admin),
):
    """Assign ticket to an agent."""
    result = await tickets_collection.update_one(
        {"_id": ObjectId(ticket_id)},
        {
            "$set": {
                "assigned_agent_id": agent_id,
                "status": TicketStatus.IN_PROGRESS.value,
                "updated_at": datetime.utcnow(),
            }
        }
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"message": f"Ticket assigned to agent {agent_id}"}
