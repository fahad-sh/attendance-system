from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from database import face_collection, users_collection, attendance_collection, photos_collection
from utils.auth import get_current_user, require_admin
from utils.face import decode_image, detect_face, extract_face_encoding, verify_face
from datetime import datetime
from bson import ObjectId
import pytz
import base64

router = APIRouter(prefix="/face", tags=["Face Detection"])

IST = pytz.timezone('Asia/Kolkata')

def get_ist_now():
    return datetime.now(IST)

def get_ist_date():
    return get_ist_now().date().isoformat()

def is_late(ist_time):
    return ist_time.hour > 9 or (ist_time.hour == 9 and ist_time.minute > 30)

async def save_photo(image_data: str, user_id: str, full_name: str, action: str, time_str: str, date: str):
    try:
        b64 = image_data.split("base64,")[1] if "base64," in image_data else image_data
        await photos_collection.insert_one({
            "user_id": user_id,
            "full_name": full_name,
            "action": action,
            "date": date,
            "time": time_str,
            "image_data": b64,
            "created_at": datetime.utcnow()
        })
        print(f"Photo saved: {full_name} {action} {date} {time_str}")
    except Exception as e:
        print(f"Error saving photo: {e}")

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
        raise HTTPException(status_code=400, detail="Could not extract face features. Try better lighting.")
    await face_collection.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id, "encoding": encoding, "registered_at": get_ist_now().strftime("%Y-%m-%d %I:%M %p IST")}},
        upsert=True
    )
    await users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": {"face_registered": True}})
    return {"message": "Face registered successfully!"}

@router.post("/verify")
async def verify_face_checkin(data: ImageData, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    full_name = current_user["full_name"]

    stored = await face_collection.find_one({"user_id": user_id})
    if not stored:
        raise HTTPException(status_code=400, detail="Face not registered. Please register your face first.")

    image_array, _ = decode_image(data.image)
    if not detect_face(image_array):
        raise HTTPException(status_code=400, detail="No face detected. Please look directly at the camera.")

    new_encoding = extract_face_encoding(image_array)
    if new_encoding is None:
        raise HTTPException(status_code=400, detail="Could not read face. Try better lighting.")

    match = verify_face(new_encoding, stored["encoding"])
    if not match:
        raise HTTPException(status_code=401, detail="Face does not match. Access denied.")

    today = get_ist_date()
    ist_now = get_ist_now()
    time_str = ist_now.strftime("%I:%M %p")
    status = "late" if is_late(ist_now) else "present"

    existing = await attendance_collection.find_one({"user_id": user_id, "date": today})

    if existing and existing.get("check_in"):
        if existing.get("check_out"):
            raise HTTPException(status_code=400, detail="Already checked out today.")

        await save_photo(data.image, user_id, full_name, "checkout", time_str, today)

        try:
            ci = datetime.strptime(existing.get("check_in", "12:00 AM"), "%I:%M %p")
            co = datetime.strptime(time_str, "%I:%M %p")
            hours = round((co - ci).seconds / 3600, 2)
        except:
            hours = 0

        await attendance_collection.update_one(
            {"user_id": user_id, "date": today},
            {"$set": {"check_out": time_str, "verified_by_face": True}}
        )
        return {"message": "Check-out successful", "action": "checkout", "time": time_str + " IST", "hours_worked": hours}
    else:
        await save_photo(data.image, user_id, full_name, "checkin", time_str, today)
        await attendance_collection.update_one(
            {"user_id": user_id, "date": today},
            {"$set": {"user_id": user_id, "full_name": full_name, "date": today,
                      "check_in": time_str, "check_out": None, "status": status, "verified_by_face": True}},
            upsert=True
        )
        return {"message": "Check-in successful", "action": "checkin", "status": status, "time": time_str + " IST"}

@router.get("/photos/list")
async def list_photos(admin: dict = Depends(require_admin)):
    cursor = photos_collection.find().sort("created_at", -1)
    photos = []
    async for photo in cursor:
        photos.append({
            "id": str(photo["_id"]),
            "full_name": photo.get("full_name", "Unknown"),
            "action": photo.get("action", "unknown"),
            "date": photo.get("date", ""),
            "time": photo.get("time", ""),
            "url": f"/api/face/photos/view/{str(photo['_id'])}"
        })
    return {"photos": photos}

@router.get("/photos/view/{photo_id}")
async def view_photo(photo_id: str, admin: dict = Depends(require_admin)):
    photo = await photos_collection.find_one({"_id": ObjectId(photo_id)})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    img_bytes = base64.b64decode(photo["image_data"])
    return Response(content=img_bytes, media_type="image/jpeg")

@router.get("/photos/view-public/{photo_id}")
async def view_photo_public(photo_id: str, token: str = None):
    from utils.auth import decode_token
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    try:
        payload = decode_token(token)
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin only")
    except:
        raise HTTPException(status_code=401, detail="Invalid token")
    photo = await photos_collection.find_one({"_id": ObjectId(photo_id)})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    img_bytes = base64.b64decode(photo["image_data"])
    return Response(content=img_bytes, media_type="image/jpeg")

@router.delete("/photos/cleanup")
async def cleanup_photos(admin: dict = Depends(require_admin)):
    result = await photos_collection.delete_many({})
    return {"message": f"Deleted {result.deleted_count} photos"}
