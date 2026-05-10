from fastapi import APIRouter, Depends
from app.database import (
    conversations_collection, messages_collection,
    tickets_collection, users_collection, db
)
from app.auth import require_admin
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

response_times_collection = db["response_times"]
feedback_collection = db["feedback"]


@router.get("/dashboard")
async def get_dashboard_stats(current_user: dict = Depends(require_admin)):
    """Get dashboard analytics."""
    now = datetime.utcnow()
    last_7_days = now - timedelta(days=7)
    last_30_days = now - timedelta(days=30)

    # Total conversations
    total_conversations = await conversations_collection.count_documents({})
    active_conversations = await conversations_collection.count_documents({"status": "active"})
    escalated_conversations = await conversations_collection.count_documents({"status": "escalated"})
    resolved_conversations = await conversations_collection.count_documents({"status": "resolved"})

    # Conversations in last 7 days
    recent_conversations = await conversations_collection.count_documents(
        {"created_at": {"$gte": last_7_days}}
    )

    # Total messages
    total_messages = await messages_collection.count_documents({})
    ai_messages = await messages_collection.count_documents({"role": "assistant"})
    user_messages = await messages_collection.count_documents({"role": "user"})

    # Tickets
    total_tickets = await tickets_collection.count_documents({})
    open_tickets = await tickets_collection.count_documents({"status": "open"})
    in_progress_tickets = await tickets_collection.count_documents({"status": "in_progress"})
    resolved_tickets = await tickets_collection.count_documents({"status": "resolved"})

    # Agents
    total_agents = await users_collection.count_documents({"role": "agent"})

    # Resolution rate
    resolution_rate = 0
    if total_conversations > 0:
        resolution_rate = round((resolved_conversations / total_conversations) * 100, 1)

    # AI resolution rate (conversations resolved without escalation)
    ai_resolved = await conversations_collection.count_documents({
        "status": "resolved",
        "assigned_agent_id": None,
    })
    ai_resolution_rate = 0
    if resolved_conversations > 0:
        ai_resolution_rate = round((ai_resolved / resolved_conversations) * 100, 1)

    # Response time stats
    rt_pipeline = [
        {"$group": {
            "_id": None,
            "avg_response_time": {"$avg": "$response_time_ms"},
            "min_response_time": {"$min": "$response_time_ms"},
            "max_response_time": {"$max": "$response_time_ms"},
            "total_responses": {"$sum": 1},
        }}
    ]
    try:
        rt_cursor = await response_times_collection.aggregate(rt_pipeline)
        rt_result = await rt_cursor.to_list(1)
        response_time_stats = {
            "avg_ms": round(rt_result[0]["avg_response_time"]) if rt_result else 0,
            "min_ms": rt_result[0]["min_response_time"] if rt_result else 0,
            "max_ms": rt_result[0]["max_response_time"] if rt_result else 0,
            "total_responses": rt_result[0]["total_responses"] if rt_result else 0,
        }
    except Exception as e:
        print(f"Response time stats error: {e}")
        response_time_stats = {"avg_ms": 0, "min_ms": 0, "max_ms": 0, "total_responses": 0}

    # Feedback stats
    fb_pipeline = [
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "total": {"$sum": 1},
        }}
    ]
    try:
        fb_cursor = await feedback_collection.aggregate(fb_pipeline)
        fb_result = await fb_cursor.to_list(1)
        feedback_stats = {
            "avg_rating": round(fb_result[0]["avg_rating"], 1) if fb_result else 0,
            "total_reviews": fb_result[0]["total"] if fb_result else 0,
        }
    except Exception as e:
        print(f"Feedback stats error: {e}")
        feedback_stats = {"avg_rating": 0, "total_reviews": 0}

    return {
        "conversations": {
            "total": total_conversations,
            "active": active_conversations,
            "escalated": escalated_conversations,
            "resolved": resolved_conversations,
            "recent_7_days": recent_conversations,
        },
        "messages": {
            "total": total_messages,
            "ai_messages": ai_messages,
            "user_messages": user_messages,
        },
        "tickets": {
            "total": total_tickets,
            "open": open_tickets,
            "in_progress": in_progress_tickets,
            "resolved": resolved_tickets,
        },
        "agents": {
            "total": total_agents,
        },
        "rates": {
            "resolution_rate": resolution_rate,
            "ai_resolution_rate": ai_resolution_rate,
        },
        "response_time": response_time_stats,
        "feedback": feedback_stats,
    }
