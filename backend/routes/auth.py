from fastapi import APIRouter, HTTPException, status, Depends
from database import users_collection
from models.user import UserRegister, UserLogin
from utils.auth import hash_password, verify_password, create_access_token, get_current_user
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/auth", tags=["Authentication"])

SUPER_ADMIN_EMAIL = "fahad@test.com"

@router.post("/register")
async def register(user: UserRegister):
    existing = await users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    role = user.role
    admin_pending = False

    if role == "admin":
        if user.email != SUPER_ADMIN_EMAIL:
            role = "employee"
            admin_pending = True

    new_user = {
        "full_name": user.full_name,
        "email": user.email,
        "password": hash_password(user.password),
        "department": user.department,
        "role": role,
        "admin_pending": admin_pending,
        "face_registered": False,
        "created_at": datetime.utcnow()
    }

    result = await users_collection.insert_one(new_user)

    if admin_pending:
        raise HTTPException(
            status_code=403,
            detail="Please get approval from the previous admin to be registered as admin."
        )

    token = create_access_token({
        "user_id": str(result.inserted_id),
        "email": user.email,
        "role": role,
        "full_name": user.full_name
    })

    return {
        "message": "Registration successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(result.inserted_id),
            "full_name": user.full_name,
            "email": user.email,
            "department": user.department,
            "role": role,
            "face_registered": False
        }
    }

@router.post("/login")
async def login(user: UserLogin):
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({
        "user_id": str(db_user["_id"]),
        "email": db_user["email"],
        "role": db_user["role"],
        "full_name": db_user["full_name"]
    })

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(db_user["_id"]),
            "full_name": db_user["full_name"],
            "email": db_user["email"],
            "department": db_user["department"],
            "role": db_user["role"],
            "face_registered": db_user.get("face_registered", False)
        }
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    db_user = await users_collection.find_one({"email": current_user["email"]})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": str(db_user["_id"]),
        "full_name": db_user["full_name"],
        "email": db_user["email"],
        "department": db_user["department"],
        "role": db_user["role"],
        "face_registered": db_user.get("face_registered", False)
    }
