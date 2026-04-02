from fastapi import APIRouter, Depends
from database import attendance_collection, leaves_collection
from utils.auth import get_current_user
from datetime import datetime, date
from bson import ObjectId

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/summary")
async def my_summary(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    cursor = attendance_collection.find({"user_id": user_id})

    total = present = late = absent_days = 0
    total_hours = 0.0

    async for record in cursor:
        total += 1
        status = record.get("status", "present")
        if status == "present":
            present += 1
        elif status == "late":
            late += 1
        check_in = record.get("check_in")
        check_out = record.get("check_out")
        if check_in and check_out:
            total_hours += (check_out - check_in).seconds / 3600

    return {
        "total_days_recorded": total,
        "present": present,
        "late": late,
        "total_hours_worked": round(total_hours, 2),
        "average_hours_per_day": round(total_hours / total, 2) if total > 0 else 0
    }

@router.post("/leave")
async def apply_leave(
    reason: str,
    from_date: str,
    to_date: str,
    current_user: dict = Depends(get_current_user)
):
    await leaves_collection.insert_one({
        "user_id": current_user["user_id"],
        "full_name": current_user["full_name"],
        "reason": reason,
        "from_date": from_date,
        "to_date": to_date,
        "status": "pending",
        "created_at": datetime.utcnow()
    })
    return {"message": "Leave request submitted successfully"}

@router.get("/leave/my")
async def my_leaves(current_user: dict = Depends(get_current_user)):
    cursor = leaves_collection.find(
        {"user_id": current_user["user_id"]}
    ).sort("created_at", -1)
    leaves = []
    async for leave in cursor:
        leaves.append({
            "id": str(leave["_id"]),
            "reason": leave.get("reason"),
            "from_date": leave.get("from_date"),
            "to_date": leave.get("to_date"),
            "status": leave.get("status", "pending"),
            "created_at": leave.get("created_at")
        })
    return leaves
