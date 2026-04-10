from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from database import users_collection, attendance_collection, leaves_collection
from utils.auth import require_admin
from bson import ObjectId
from datetime import datetime, date
import pandas as pd
import io

router = APIRouter(prefix="/admin", tags=["Admin"])

# ─── Dashboard Overview ───────────────────────────────────────────────────────

@router.get("/dashboard")
async def dashboard(admin: dict = Depends(require_admin)):
    today = date.today().isoformat()

    total_employees = await users_collection.count_documents({"role": "employee"})
    present_today = await attendance_collection.count_documents({
        "date": today,
        "check_in": {"$ne": None}
    })
    late_today = await attendance_collection.count_documents({
        "date": today,
        "status": "late"
    })
    absent_today = total_employees - present_today
    pending_leaves = await leaves_collection.count_documents({"status": "pending"})

    return {
        "total_employees": total_employees,
        "present_today": present_today,
        "absent_today": absent_today,
        "late_today": late_today,
        "pending_leaves": pending_leaves,
        "date": today
    }

# ─── Employee Management ──────────────────────────────────────────────────────

@router.get("/employees")
async def get_all_employees(admin: dict = Depends(require_admin)):
    cursor = users_collection.find({"role": "employee"})
    employees = []
    async for emp in cursor:
        employees.append({
            "id": str(emp["_id"]),
            "full_name": emp["full_name"],
            "email": emp["email"],
            "department": emp["department"],
            "face_registered": emp.get("face_registered", False),
            "created_at": emp.get("created_at")
        })
    return employees

@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, admin: dict = Depends(require_admin)):
    result = await users_collection.delete_one({"_id": ObjectId(employee_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted successfully"}

@router.put("/employees/{employee_id}/role")
async def update_role(employee_id: str, role: str, admin: dict = Depends(require_admin)):
    if role not in ["employee", "admin"]:
        raise HTTPException(status_code=400, detail="Role must be employee or admin")
    await users_collection.update_one(
        {"_id": ObjectId(employee_id)},
        {"$set": {"role": role}}
    )
    return {"message": f"Role updated to {role}"}

# ─── Today's Attendance ───────────────────────────────────────────────────────

@router.get("/attendance/today")
async def todays_attendance(admin: dict = Depends(require_admin)):
    today = date.today().isoformat()
    cursor = attendance_collection.find({"date": today})
    records = []
    async for record in cursor:
        records.append({
            "full_name": record.get("full_name"),
            "user_id": record.get("user_id"),
            "check_in": record.get("check_in"),
            "check_out": record.get("check_out"),
            "status": record.get("status", "present"),
            "verified_by_face": record.get("verified_by_face", False)
        })
    return records

# ─── Attendance Reports ───────────────────────────────────────────────────────

@router.get("/attendance/report")
async def attendance_report(
    from_date: str = None,
    to_date: str = None,
    department: str = None,
    admin: dict = Depends(require_admin)
):
    query = {}

    if from_date and to_date:
        query["date"] = {"$gte": from_date, "$lte": to_date}
    elif from_date:
        query["date"] = {"$gte": from_date}

    cursor = attendance_collection.find(query).sort("date", -1)
    records = []

    async for record in cursor:
        user = await users_collection.find_one(
            {"_id": ObjectId(record["user_id"])}
        ) if record.get("user_id") else None

        if department and (not user or user.get("department") != department):
            continue

        check_in = record.get("check_in")
        check_out = record.get("check_out")
        hours = None
        if check_in and check_out:
            hours = round((check_out - check_in).seconds / 3600, 2)

        records.append({
            "full_name": record.get("full_name"),
            "department": user.get("department") if user else "N/A",
            "date": record.get("date"),
            "check_in": check_in,
            "check_out": check_out,
            "hours_worked": hours,
            "status": record.get("status", "present"),
            "verified_by_face": record.get("verified_by_face", False)
        })

    return records

# ─── Export CSV ───────────────────────────────────────────────────────────────

@router.get("/attendance/export")
async def export_csv(
    from_date: str = None,
    to_date: str = None,
    admin: dict = Depends(require_admin)
):
    query = {}
    if from_date and to_date:
        query["date"] = {"$gte": from_date, "$lte": to_date}

    cursor = attendance_collection.find(query).sort("date", -1)
    rows = []

    async for record in cursor:
        user = await users_collection.find_one(
            {"_id": ObjectId(record["user_id"])}
        ) if record.get("user_id") else None

        check_in = record.get("check_in")
        check_out = record.get("check_out")
        hours = None
        if check_in and check_out:
            hours = round((check_out - check_in).seconds / 3600, 2)

        rows.append({
            "Name": record.get("full_name", "N/A"),
            "Department": user.get("department", "N/A") if user else "N/A",
            "Date": record.get("date"),
            "Check In": check_in.strftime("%H:%M:%S") if check_in else "N/A",
            "Check Out": check_out.strftime("%H:%M:%S") if check_out else "N/A",
            "Hours Worked": hours if hours else "N/A",
            "Status": record.get("status", "present"),
            "Face Verified": "Yes" if record.get("verified_by_face") else "No"
        })

    df = pd.DataFrame(rows)
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)

    filename = f"attendance_{from_date}_to_{to_date}.csv" if from_date else "attendance_report.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ─── Leave Management ─────────────────────────────────────────────────────────

@router.get("/leaves")
async def get_leaves(admin: dict = Depends(require_admin)):
    cursor = leaves_collection.find().sort("created_at", -1)
    leaves = []
    async for leave in cursor:
        leaves.append({
            "id": str(leave["_id"]),
            "user_id": leave.get("user_id"),
            "full_name": leave.get("full_name"),
            "reason": leave.get("reason"),
            "from_date": leave.get("from_date"),
            "to_date": leave.get("to_date"),
            "status": leave.get("status", "pending"),
            "created_at": leave.get("created_at")
        })
    return leaves

@router.put("/leaves/{leave_id}")
async def update_leave(
    leave_id: str,
    status: str,
    admin: dict = Depends(require_admin)
):
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")
    result = await leaves_collection.update_one(
        {"_id": ObjectId(leave_id)},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return {"message": f"Leave {status} successfully"}

@router.get("/pending-admins")
async def get_pending_admins(admin: dict = Depends(require_admin)):
    cursor = users_collection.find({"admin_pending": True})
    pending = []
    async for user in cursor:
        pending.append({
            "id": str(user["_id"]),
            "full_name": user["full_name"],
            "email": user["email"],
            "department": user["department"]
        })
    return pending

@router.put("/approve-admin/{user_id}")
async def approve_admin(user_id: str, admin: dict = Depends(require_admin)):
    await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"role": "admin", "admin_pending": False}}
    )
    return {"message": "User approved as admin"}
