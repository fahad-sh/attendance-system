from fastapi import APIRouter, HTTPException, Depends
from database import attendance_collection
from utils.auth import get_current_user
from datetime import datetime, date
import pytz

router = APIRouter(prefix="/attendance", tags=["Attendance"])

IST = pytz.timezone('Asia/Kolkata')

def get_ist_now():
    return datetime.now(IST)

def get_ist_date():
    return get_ist_now().date().isoformat()

@router.post("/checkin")
async def check_in(current_user: dict = Depends(get_current_user)):
    today = get_ist_date()
    ist_now = get_ist_now()
    user_id = current_user["user_id"]

    existing = await attendance_collection.find_one({"user_id": user_id, "date": today})
    if existing and existing.get("check_in"):
        raise HTTPException(status_code=400, detail="Already checked in today")

    utc_now = datetime.utcnow()
    status = "late" if (ist_now.hour > 9 or (ist_now.hour == 9 and ist_now.minute > 30)) else "present"

    if existing:
        await attendance_collection.update_one(
            {"user_id": user_id, "date": today},
            {"$set": {"check_in": utc_now, "check_in_ist": ist_now.strftime("%H:%M:%S"), "status": status}}
        )
    else:
        await attendance_collection.insert_one({
            "user_id": user_id,
            "full_name": current_user["full_name"],
            "date": today,
            "check_in": utc_now,
            "check_in_ist": ist_now.strftime("%H:%M:%S"),
            "check_out": None,
            "status": status,
            "verified_by_face": False
        })

    return {
        "message": "Check-in successful",
        "time_ist": ist_now.strftime("%I:%M %p IST"),
        "status": status
    }

@router.post("/checkout")
async def check_out(current_user: dict = Depends(get_current_user)):
    today = get_ist_date()
    ist_now = get_ist_now()
    user_id = current_user["user_id"]

    existing = await attendance_collection.find_one({"user_id": user_id, "date": today})
    if not existing or not existing.get("check_in"):
        raise HTTPException(status_code=400, detail="You haven't checked in today")
    if existing.get("check_out"):
        raise HTTPException(status_code=400, detail="Already checked out today")

    utc_now = datetime.utcnow()
    await attendance_collection.update_one(
        {"user_id": user_id, "date": today},
        {"$set": {"check_out": utc_now, "check_out_ist": ist_now.strftime("%H:%M:%S")}}
    )

    hours = round((utc_now - existing["check_in"]).seconds / 3600, 2)
    return {
        "message": "Check-out successful",
        "time_ist": ist_now.strftime("%I:%M %p IST"),
        "hours_worked": hours
    }

@router.get("/today")
async def get_today(current_user: dict = Depends(get_current_user)):
    today = get_ist_date()
    record = await attendance_collection.find_one({"user_id": current_user["user_id"], "date": today})
    if not record:
        return {"checked_in": False, "checked_out": False, "date": today}
    return {
        "checked_in": bool(record.get("check_in")),
        "checked_out": bool(record.get("check_out")),
        "check_in": record.get("check_in_ist"),
        "check_out": record.get("check_out_ist"),
        "status": record.get("status"),
        "date": today
    }

@router.get("/my-history")
async def my_history(current_user: dict = Depends(get_current_user)):
    cursor = attendance_collection.find(
        {"user_id": current_user["user_id"]}
    ).sort("date", -1).limit(30)
    records = []
    async for record in cursor:
        records.append({
            "date": record["date"],
            "check_in": record.get("check_in_ist"),
            "check_out": record.get("check_out_ist"),
            "status": record.get("status", "present"),
            "verified_by_face": record.get("verified_by_face", False)
        })
    return records
