from fastapi import APIRouter, HTTPException
from datetime import datetime
import pytz
from db import users_col
from auth import hash_password
from models import PatientRegister, DoctorRegister, HospitalAdminRegister

router = APIRouter(prefix="/register", tags=["Register"])
IST = pytz.timezone("Asia/Kolkata")

@router.post("/patient")
def register_patient(data: PatientRegister):
    if users_col.find_one({"email": data.email}):
        raise HTTPException(400, "Email already exists")

    user = {
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "passwordHash": hash_password(data.password),
        "role": "PATIENT",
        "createdAt": datetime.now(IST)
    }

    users_col.insert_one(user)
    return {"message": "Patient registered successfully"}


@router.post("/doctor")
def register_doctor(data: DoctorRegister):
    if users_col.find_one({"email": data.email}):
        raise HTTPException(400, "Email already exists")

    user = {
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "passwordHash": hash_password(data.password),
        "role": "DOCTOR",
        "specialization": data.specialization,
        "licenseNumber": data.licenseNumber,
        "hospitalId": data.hospitalId,
        # Added GPS fields from your frontend form
        "location": {
            "type": "Point",
            "coordinates": [data.longitude, data.latitude] if data.longitude and data.latitude else None
        },
        "latitude": data.latitude,
        "longitude": data.longitude,
        "status": "PENDING",
        "createdAt": datetime.now(IST)
    }

    users_col.insert_one(user)
    return {"message": "Doctor registered. Await hospital admin approval."}

@router.post("/hospital-admin")
def register_hospital_admin(data: HospitalAdminRegister):
    if users_col.find_one({"email": data.email}):
        raise HTTPException(400, "Email already exists")

    user = {
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "passwordHash": hash_password(data.password),
        "role": "HOSPITAL_ADMIN",
        "hospitalId": data.hospitalId,
        "createdAt": datetime.now(IST)
    }
    
    users_col.insert_one(user)
    return {"message": "Hospital Admin registered successfully."}