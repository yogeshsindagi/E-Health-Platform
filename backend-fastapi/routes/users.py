from fastapi import APIRouter, HTTPException
from bson import ObjectId
from db import users_col, hospitals_col

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/doctor/{doctor_id}")
def get_doctor_details(doctor_id: str):
    """Get doctor details by ID"""
    try:
        doctor = users_col.find_one({"_id": ObjectId(doctor_id), "role": "DOCTOR"})
        
        if not doctor:
            raise HTTPException(404, "Doctor not found")
        
        # Get hospital details
        hospital = hospitals_col.find_one({"hospitalId": doctor.get("hospitalId")})
        
        return {
            "_id": str(doctor["_id"]),
            "name": doctor.get("name", "Unknown"),
            "email": doctor.get("email", ""),
            "specialization": doctor.get("specialization", "General"),
            "licenseNumber": doctor.get("licenseNumber", ""),
            "hospitalId": doctor.get("hospitalId", ""),
            "hospitalName": hospital.get("hospitalName", "") if hospital else ""
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch doctor details: {str(e)}")
