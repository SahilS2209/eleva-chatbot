from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.database import users_collection
from app.auth import require_admin
from bson import ObjectId
from datetime import datetime

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/agents")
async def list_agents(current_user: dict = Depends(require_admin)):
    """List all support agents (admin only)."""
    agents = []
    cursor = users_collection.find({"role": {"$in": ["agent", "admin"]}})
    async for user in cursor:
        # Don't show the current admin in the list
        if str(user["_id"]) == current_user["id"]:
            continue
        agents.append({
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "created_at": user["created_at"].isoformat(),
            "is_active": user.get("is_active", True),
        })
    return agents


@router.patch("/{user_id}/role")
async def change_user_role(
    user_id: str,
    new_role: str,
    current_user: dict = Depends(require_admin),
):
    """Change a user's role (admin only)."""
    if new_role not in ["admin", "agent"]:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'agent'")

    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": new_role}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": f"Role updated to {new_role}"}


@router.patch("/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    current_user: dict = Depends(require_admin),
):
    """Activate or deactivate a user (admin only)."""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_status = not user.get("is_active", True)
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": new_status}}
    )
    return {"message": f"User {'activated' if new_status else 'deactivated'}", "is_active": new_status}


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
):
    """Delete a user (admin only)."""
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    result = await users_collection.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}
