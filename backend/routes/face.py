from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import face_collection, users_collection, attendance_collection
from utils.auth import get_current_user
from utils.face import decode_image, detect_face, extract_face_encoding, verify_face
from datetime import datetime, date

router = APIRouter(prefix="/api/face", tags=["Face Detection"])

class ImageData(BaseModel):
    image: str  # base64 encoded image

@router.post("/register")
async def register_face(data: ImageData, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    # Decode and check image
    image_array = decode_image(data.image)

    # Detect face
    if not detect_face(image_array):
        raise HTTPException(status_code=400, detail="No face detected. Please look directly at the camera.")

    # Extract encoding
    encoding = extract_face_encoding(image_array)
    if encoding is None:
        raise HTTPException(status_code=400, detail="Could not extract face features. Try better lighting.")

    # Save or update in database
    await face_collection.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "encoding": encoding,
            "registered_at": datetime.utcnow()
        }},
        upsert=True
    )

    # Mark user as face registered
    await users_collection.update_one(
        {"_id": __import__('bson').ObjectId(user_id)},
        {"$set": {"face_registered": True}}
    )

    return {"message": "Face registered successfully"}

@router.post("/verify")
async def verify_face_checkin(data: ImageData, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    # Get stored face encoding
    stored = await face_collection.find_one({"user_id": user_id})
    if not stored:
        raise HTTPException(status_code=400, detail="Face not registered. Please register your face first.")

    # Decode and detect face
    image_array = decode_image(data.image)
    if not detect_face(image_array):
        raise HTTPException(status_code=400, detail="No face detected. Please look at the camera.")

    # Extract encoding
    new_encoding = extract_face_encoding(image_array)
    if new_encoding is None:
        raise HTTPException(status_code=400, detail="Could not read face. Try better lighting.")

    # Compare faces
    match = verify_face(new_encoding, stored["encoding"])
    if not match:
        raise HTTPException(status_code=401, detail="Face does not match. Access denied.")

    # Mark attendance
    today = date.today().isoformat()
    existing = await attendance_collection.find_one({"user_id": user_id, "date": today})

    now = datetime.utcnow()
    status = "late" if (now.hour > 9 or (now.hour == 9 and now.minute > 30)) else "present"

    if existing and existing.get("check_in"):
        # Check out
        if existing.get("check_out"):
            raise HTTPException(status_code=400, detail="Already checked out today")
        await attendance_collection.update_one(
            {"user_id": user_id, "date": today},
            {"$set": {"check_out": now, "verified_by_face": True}}
        )
        hours = round((now - existing["check_in"]).seconds / 3600, 2)
        return {"message": "Check-out successful via face", "hours_worked": hours, "action": "checkout"}
    else:
        # Check in
        await attendance_collection.update_one(
            {"user_id": user_id, "date": today},
            {"$set": {
                "user_id": user_id,
                "full_name": current_user["full_name"],
                "date": today,
                "check_in": now,
                "check_out": None,
                "status": status,
                "verified_by_face": True
            }},
            upsert=True
        )
        return {"message": "Check-in successful via face", "status": status, "action": "checkin"}
