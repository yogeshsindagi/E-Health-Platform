from fastapi import APIRouter, Depends, HTTPException
from db import users_col, hospitals_col
from jose import jwt
from auth import SECRET_KEY, ALGORITHM
from bson import ObjectId
from fastapi.security import OAuth2PasswordBearer

# 1. Setup Router & Security
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login/hospital-admin")
router = APIRouter(prefix="/hospital-admin", tags=["Hospital Admin"])

def admin_guard(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload["role"] != "HOSPITAL_ADMIN":
            raise HTTPException(403, "Access denied")
        return payload
    except Exception:
        raise HTTPException(401, "Invalid token")

# 2. Dashboard Stats Route
@router.get("/overview")
def get_hospital_overview(admin_payload=Depends(admin_guard)):
    
    # Get Admin User
    admin_id = admin_payload["user_id"]
    admin_user = users_col.find_one({"_id": ObjectId(admin_id)})
    
    if not admin_user:
        raise HTTPException(404, "Admin user not found")
        
    hospital_id = admin_user.get("hospitalId") 
    
    if not hospital_id:
        raise HTTPException(400, "Admin is not linked to any hospital")

    # Fetch Hospital Details
    hospital_data = hospitals_col.find_one({"hospitalId": hospital_id})
    
    if not hospital_data:
        raise HTTPException(404, f"Hospital details not found for ID '{hospital_id}'")

    # Count Pending Doctors
    pending_count = users_col.count_documents({
        "role": "DOCTOR",
        "hospitalId": hospital_id, 
        "status": "PENDING"
    })

    return {
        "hospitalName": hospital_data.get("hospitalName"),
        "city": hospital_data.get("city"),
        "state": hospital_data.get("state"),
        "coordinates": hospital_data.get("location", {}).get("coordinates", [0,0]),
        "pendingApprovals": pending_count
    }

# 3. Get All Doctors (Pending & Approved)
@router.get("/doctors")
def get_all_doctors(admin_payload=Depends(admin_guard)):
    
    # Get Admin's Hospital ID
    admin_id = admin_payload["user_id"]
    admin_user = users_col.find_one({"_id": ObjectId(admin_id)})
    hospital_id = admin_user.get("hospitalId")
    
    if not hospital_id:
        return []

    # Fetch doctors that are either PENDING or APPROVED
    doctors = list(users_col.find(
        {
            "role": "DOCTOR", 
            "hospitalId": hospital_id,
            "status": {"$in": ["PENDING", "APPROVED"]} # <--- Fetch both types
        }, 
        {"passwordHash": 0}
    ))
    
    # Convert ObjectId to string
    for doc in doctors:
        doc["_id"] = str(doc["_id"])
        
    return doctors

# 4. Approve Doctor
@router.post("/approve/{doctor_id}")
def approve_doctor(doctor_id: str, admin_payload=Depends(admin_guard)):
    try:
        oid = ObjectId(doctor_id)
    except:
        raise HTTPException(400, "Invalid Doctor ID format")

    # Security: Get Admin's Hospital ID to ensure we only approve OUR doctors
    admin_id = admin_payload["user_id"]
    admin_user = users_col.find_one({"_id": ObjectId(admin_id)})
    hospital_id = admin_user.get("hospitalId")

    result = users_col.update_one(
        {
            "_id": oid, 
            "role": "DOCTOR", 
            "hospitalId": hospital_id # Security check
        },
        {"$set": {"status": "APPROVED"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "Doctor not found or belongs to another hospital")

    return {"message": "Doctor approved successfully"}

# 5. Reject Doctor (New Route)
@router.post("/reject/{doctor_id}")
def reject_doctor(doctor_id: str, admin_payload=Depends(admin_guard)):
    try:
        oid = ObjectId(doctor_id)
    except:
        raise HTTPException(400, "Invalid Doctor ID format")

    # Security: Get Admin's Hospital ID
    admin_id = admin_payload["user_id"]
    admin_user = users_col.find_one({"_id": ObjectId(admin_id)})
    hospital_id = admin_user.get("hospitalId")

    # Update status to REJECTED
    result = users_col.update_one(
        {
            "_id": oid, 
            "role": "DOCTOR", 
            "hospitalId": hospital_id 
        },
        {"$set": {"status": "REJECTED"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(404, "Doctor not found or belongs to another hospital")

    return {"message": "Doctor rejected/revoked successfully"}