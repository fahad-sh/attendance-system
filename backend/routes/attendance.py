from fastapi import APIRouter, HTTPException, Depends
from database import attendance_collection
from utils.auth import get_current_user
from datetime import datetime
import pytz

router = APIRouter(prefix="/attendance", tags=["Attendance"])

IST = pytz.timezone('Asia/Kolkata')

def get_ist_now():
    return datetime.now(IST)

def get_ist_date():
    return get_ist_now().date().isoformat()

def is_late(ist_time):
    return ist_time.hour > 9 or (ist_time.hour == 9 and ist_time.minute > 30)

@router.post("/checkin")
async def check_in(current_user: dict = Depends(get_current_user)):
    today = get_ist_date()
    ist_now = get_ist_now()
    user_id = current_user["user_id"]
    existing = await attendance_collection.find_one({"user_id": user_id, "date": today})
    if existing and existing.get("check_in"):
        raise HTTPException(status_code=400, detail="Already checked in today")
    status = "late" if is_late(ist_now) else "present"
    time_str = ist_now.strftime("%I:%M %p")
    if existing:
        await attendance_collection.update_one(
            {"user_id": user_id, "date": today},
            {"$set": {"check_in": time_str, "status": status}}
        )
    else:
        await attendance_collection.insert_one({
            "user_id": user_id,
            "full_name": current_user["full_name"],
            "date": today,
            "check_in": time_str,
            "check_out": None,
            "status": status,
            "verified_by_face": False
        })
    return {"message": "Check-in successful", "time": time_str + " IST", "status": status}

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
    time_str = ist_now.strftime("%I:%M %p")
    await attendance_collection.update_one(
        {"user_id": user_id, "date": today},
        {"$set": {"check_out": time_str}}
    )
    return {"message": "Check-out successful", "time": time_str + " IST"}

@router.get("/today")
async def get_today(current_user: dict = Depends(get_current_user)):
    today = get_ist_date()
    record = await attendance_collection.find_one({
        "user_id": current_user["user_id"],
        "date": today
    })
    if not record:
        return {
            "checked_in": False,
            "checked_out": False,
            "check_in": None,
            "check_out": None,
            "status": None,
            "date": today
        }

    # Get check_in value - handle both string and datetime formats
    check_in = record.get("check_in")
    check_out = record.get("check_out")

    # Convert datetime objects to IST string if needed
    if check_in and isinstance(check_in, datetime):
        check_in = check_in.replace(tzinfo=pytz.utc).astimezone(IST).strftime("%I:%M %p")
    if check_out and isinstance(check_out, datetime):
        check_out = check_out.replace(tzinfo=pytz.utc).astimezone(IST).strftime("%I:%M %p")

    return {
        "checked_in": bool(check_in),
        "checked_out": bool(check_out),
        "check_in": check_in,
        "check_out": check_out,
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
        check_in = record.get("check_in")
        check_out = record.get("check_out")
        if check_in and isinstance(check_in, datetime):
            check_in = check_in.replace(tzinfo=pytz.utc).astimezone(IST).strftime("%I:%M %p")
        if check_out and isinstance(check_out, datetime):
            check_out = check_out.replace(tzinfo=pytz.utc).astimezone(IST).strftime("%I:%M %p")
        records.append({
            "date": record["date"],
            "check_in": check_in,
            "check_out": check_out,
            "status": record.get("status", "present"),
            "verified_by_face": record.get("verified_by_face", False)
        })
    return records
