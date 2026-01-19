from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
import pytz
from bson import ObjectId
import hashlib, json

from db import prescriptions_col, appointments_col
from models import PrescriptionCreate
from security import doctor_guard, patient_guard

router = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])
IST = pytz.timezone("Asia/Kolkata")

@router.post("/doctor")
def create_prescription(data: PrescriptionCreate, user=Depends(doctor_guard)):
    try:
        appointment = appointments_col.find_one({
            "_id": ObjectId(data.appointmentId),
            "doctorId": ObjectId(user["user_id"]),
            "status": "ACCEPTED"
        })

        if not appointment:
            raise HTTPException(403, "Invalid appointment")

        prescription = {
            "patientId": ObjectId(data.patientId),
            "doctorId": ObjectId(user["user_id"]),
            "hospitalId": appointment["hospitalId"], # Assuming this is already ObjectId in DB
            "appointmentId": ObjectId(data.appointmentId),
            "diagnosis": data.diagnosis,
            "medicines": [m.dict() for m in data.medicines],
            "notes": data.notes,
            "createdAt": datetime.now(IST)
        }

        # Hash for blockchain / tamper proof
        hash_value = hashlib.sha256(json.dumps(prescription, default=str).encode()).hexdigest()
        prescription["hash"] = hash_value

        prescriptions_col.insert_one(prescription)

        return {
            "message": "Prescription created successfully",
            "hash": hash_value
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Prescription creation failed: {str(e)}")


@router.get("/patient")
def get_my_prescriptions(user=Depends(patient_guard)):
    try:
        # 1. Fetch from DB
        prescriptions = list(prescriptions_col.find(
            {"patientId": ObjectId(user["user_id"])}
        ))

        # 2. FIX: Convert ALL ObjectIds to Strings
        for pres in prescriptions:
            pres["_id"] = str(pres["_id"])
            pres["patientId"] = str(pres["patientId"])
            pres["doctorId"] = str(pres["doctorId"])
            
            # These fields might not exist in old records, so we use .get() or check
            if "hospitalId" in pres:
                pres["hospitalId"] = str(pres["hospitalId"])
            if "appointmentId" in pres:
                pres["appointmentId"] = str(pres["appointmentId"])
                
        return prescriptions
    except Exception as e:
        print(f"Error fetching prescriptions: {e}") # Debugging
        raise HTTPException(500, f"Fetch failed: {str(e)}")

@router.get("/doctor")
def get_doctor_prescriptions(user=Depends(doctor_guard)):
    try:
        # 1. Fetch from DB
        prescriptions = list(prescriptions_col.find(
            {"doctorId": ObjectId(user["user_id"])}
        ))

        # 2. FIX: Convert ALL ObjectIds to Strings
        for pres in prescriptions:
            pres["_id"] = str(pres["_id"])
            pres["patientId"] = str(pres["patientId"])
            pres["doctorId"] = str(pres["doctorId"])
            
            if "hospitalId" in pres:
                pres["hospitalId"] = str(pres["hospitalId"])
            if "appointmentId" in pres:
                pres["appointmentId"] = str(pres["appointmentId"])

        return prescriptions
    except Exception as e:
        raise HTTPException(500, f"Fetch failed: {str(e)}")