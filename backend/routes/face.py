from fastapi import APIRouter, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from database import face_collection, users_collection, attendance_collection
from utils.auth import get_current_user
from utils.face import decode_image, detect_face, extract_face_encoding, verify_face, save_attendance_photo
from datetime import datetime, date, timedelta
import pytz

router = APIRouter(prefix="/face", tags=["Face Detection"])

IST = pytz.timezone('Asia/Kolkata')

def get_ist_now():
    return datetime.now(IST)

def get_ist_date():
    return get_ist_now().date().isoformat()

def is_late(ist_time):
    return ist_time.hour > 9 or (ist_time.hour == 9 and ist_time.minute > 30)

class ImageData(BaseModel):
    image: str

@router.post("/register")
async def register_face(data: ImageData, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    image_array, _ = decode_image(data.image)

    if not detect_face(image_array):
        raise HTTPException(status_code=400, detail="No face detected. Please look directly at the camera in good lighting.")

    encoding = extract_face_encoding(image_array)
    if encoding is None:
        raise HTTPException(status_code=400, detail="Could not extract face features. Try better lighting and look straight at camera.")

    await face_collection.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "encoding": encoding,
            "registered_at": datetime.utcnow()
        }},
        upsert=True
    )

    from bson import ObjectId
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"face_registered": True}}
    )

    return {"message": "Face registered successfully! You can now mark attendance."}

@router.post("/verify")
async def verify_face_checkin(data: ImageData, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    stored = await face_collection.find_one({"user_id": user_id})
    if not stored:
        raise HTTPException(status_code=400, detail="Face not registered. Please register your face first.")

    image_array, _ = decode_image(data.image)

    if not detect_face(image_array):
        raise HTTPException(status_code=400, detail="No face detected. Please look directly at the camera.")

    new_encoding = extract_face_encoding(image_array)
    if new_encoding is None:
        raise HTTPException(status_code=400, detail="Could not read face features. Try better lighting.")

    match = verify_face(new_encoding, stored["encoding"])
    if not match:
        raise HTTPException(status_code=401, detail="Face does not match. Access denied. Please try again or contact admin.")

    today = get_ist_date()
    ist_now = get_ist_now()
    existing = await attendance_collection.find_one({"user_id": user_id, "date": today})

    utc_now = datetime.utcnow()
    status = "late" if is_late(ist_now) else "present"

    if existing and existing.get("check_in"):
        if existing.get("check_out"):
            raise HTTPException(status_code=400, detail="Already checked out today.")

        photo_filename = save_attendance_photo(data.image, user_id, "checkout")

        await attendance_collection.update_one(
            {"user_id": user_id, "date": today},
            {"$set": {
                "check_out": utc_now,
                "check_out_ist": ist_now.strftime("%H:%M:%S"),
                "check_out_photo": photo_filename,
                "verified_by_face": True
            }}
        )

        hours = round((utc_now - existing["check_in"]).seconds / 3600, 2)
        return {
            "message": "Check-out successful",
            "action": "checkout",
            "time_ist": ist_now.strftime("%I:%M %p IST"),
            "hours_worked": hours
        }
    else:
        photo_filename = save_attendance_photo(data.image, user_id, "checkin")

        await attendance_collection.update_one(
            {"user_id": user_id, "date": today},
            {"$set": {
                "user_id": user_id,
                "full_name": current_user["full_name"],
                "date": today,
                "check_in": utc_now,
                "check_in_ist": ist_now.strftime("%H:%M:%S"),
                "check_in_photo": photo_filename,
                "check_out": None,
                "status": status,
                "verified_by_face": True
            }},
            upsert=True
        )

        return {
            "message": "Check-in successful",
            "action": "checkin",
            "status": status,
            "time_ist": ist_now.strftime("%I:%M %p IST"),
        }

@router.get("/photos")
async def list_photos(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    import os
    photos_dir = "/app/attendance_photos"
    if not os.path.exists(photos_dir):
        return {"photos": []}
    photos = []
    for filename in os.listdir(photos_dir):
        if filename.endswith('.jpg'):
            parts = filename.replace('.jpg', '').split('_')
            photos.append({
                "filename": filename,
                "url": f"/api/face/photo/{filename}"
            })
    return {"photos": photos}

@router.delete("/photos/cleanup")
async def cleanup_photos(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    from utils.face import delete_old_photos
    count = delete_old_photos()
    return {"message": f"Deleted {count} photos"}
