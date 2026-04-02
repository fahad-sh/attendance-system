from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.attendance import router as attendance_router
from routes.face import router as face_router
from routes.admin import router as admin_router
from routes.reports import router as reports_router

app = FastAPI(
    title="Attendance Management System",
    description="Office attendance tracking with face detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(attendance_router)
app.include_router(face_router)
app.include_router(admin_router)
app.include_router(reports_router)

@app.get("/")
def root():
    return {"message": "Attendance API is running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "ok"}
