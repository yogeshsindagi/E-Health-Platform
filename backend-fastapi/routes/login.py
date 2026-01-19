from fastapi import APIRouter, HTTPException
from db import users_col
from auth import verify_password, create_access_token
from models import LoginRequest

router = APIRouter(tags=["Login"])

@router.post("/login")
def login(data: LoginRequest):
    user = users_col.find_one({"email": data.email})

    if not user or not verify_password(data.password, user["passwordHash"]):
        raise HTTPException(401, "Invalid credentials")

    if user["role"] == "DOCTOR" and user["status"] != "APPROVED":
        raise HTTPException(403, "Doctor not approved yet")

    token = create_access_token({
        "user_id": str(user["_id"]),
        "role": user["role"],
        "name": user["name"]
    })

    return {
        "access_token": token,
        "role": user["role"],
        "name": user["name"]
    }


@router.post("/login/hospital-admin")
def login_hospital_admin(data: LoginRequest):
    user = users_col.find_one({"email": data.email, "role": "HOSPITAL_ADMIN"})

    if not user or not verify_password(data.password, user["passwordHash"]):
        raise HTTPException(401, "Invalid credentials")

    token = create_access_token({
        "user_id": str(user["_id"]),
        "role": "HOSPITAL_ADMIN",
        "name": user["name"]
    })

    return {
        "access_token": token,
        "role": "HOSPITAL_ADMIN",
        "name": user["name"]
    }


@router.post("/login/system-admin")
def login_system_admin(data: LoginRequest):
    user = users_col.find_one({"email": data.email, "role": "SYSTEM_ADMIN"})

    if not user or not verify_password(data.password, user["passwordHash"]):
        raise HTTPException(401, "Invalid credentials")

    token = create_access_token({
        "user_id": str(user["_id"]),
        "role": "SYSTEM_ADMIN",
        "name": user["name"]
    })

    return {
        "access_token": token,
        "role": "SYSTEM_ADMIN",
        "name": user["name"]
    }
