from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin:StrongPass123!@mongo:27017")

client = AsyncIOMotorClient(MONGO_URI)
db = client["attendance_db"]

# Collections
users_collection = db["users"]
attendance_collection = db["attendance"]
face_collection = db["face_data"]
departments_collection = db["departments"]
leaves_collection = db["leaves"]
