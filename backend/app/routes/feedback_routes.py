from fastapi import APIRouter, HTTPException
from app.database import conversations_collection, db
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

feedback_collection = db["feedback"]


class FeedbackCreate(BaseModel):
    conversation_id: str
    rating: int  # 1-5
    comment: Optional[str] = None


@router.post("")
async def submit_feedback(data: FeedbackCreate):
    """Submit customer satisfaction rating after chat ends."""
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    # Verify conversation exists
    conv = await conversations_collection.find_one({"_id": ObjectId(data.conversation_id)})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    feedback_doc = {
        "conversation_id": data.conversation_id,
        "rating": data.rating,
        "comment": data.comment,
        "created_at": datetime.utcnow(),
    }
    await feedback_collection.insert_one(feedback_doc)
    return {"message": "Thank you for your feedback!"}


@router.get("/stats")
async def get_feedback_stats():
    """Get average rating and feedback count."""
    pipeline = [
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "total": {"$sum": 1},
            "five_star": {"$sum": {"$cond": [{"$eq": ["$rating", 5]}, 1, 0]}},
            "four_star": {"$sum": {"$cond": [{"$eq": ["$rating", 4]}, 1, 0]}},
            "three_star": {"$sum": {"$cond": [{"$eq": ["$rating", 3]}, 1, 0]}},
            "two_star": {"$sum": {"$cond": [{"$eq": ["$rating", 2]}, 1, 0]}},
            "one_star": {"$sum": {"$cond": [{"$eq": ["$rating", 1]}, 1, 0]}},
        }}
    ]
    cursor = await feedback_collection.aggregate(pipeline)
    result = await cursor.to_list(1)
    if not result:
        return {"avg_rating": 0, "total": 0, "breakdown": {}}

    data = result[0]
    return {
        "avg_rating": round(data["avg_rating"], 1),
        "total": data["total"],
        "breakdown": {
            "5": data["five_star"],
            "4": data["four_star"],
            "3": data["three_star"],
            "2": data["two_star"],
            "1": data["one_star"],
        }
    }


@router.get("/list")
async def list_feedback(limit: int = 10, skip: int = 0):
    """List feedback entries with pagination."""
    feedbacks = []
    cursor = feedback_collection.find().sort("created_at", -1).skip(skip).limit(limit)
    async for fb in cursor:
        feedbacks.append({
            "id": str(fb["_id"]),
            "conversation_id": fb["conversation_id"],
            "rating": fb["rating"],
            "comment": fb.get("comment") or None,
            "created_at": fb["created_at"].isoformat(),
        })
    total = await feedback_collection.count_documents({})
    return {"feedbacks": feedbacks, "total": total}
