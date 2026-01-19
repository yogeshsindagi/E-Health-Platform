from fastapi import APIRouter, HTTPException
from db import hospitals_col

# Public route - anyone can see the list of hospitals
router = APIRouter(prefix="/hospitals", tags=["Hospitals"])

@router.get("/")
def get_all_hospitals():
    """
    Fetch all hospitals. 
    Used to populate dropdowns in the frontend.
    """
    # We exclude '_id' to return cleaner JSON, 
    # relying on your custom 'hospitalId' as the unique key.
    hospitals = list(hospitals_col.find({}, {"_id": 0}))
    
    return hospitals

@router.get("/{hospital_id}")
def get_hospital_details(hospital_id: str):
    """
    Get specific details (location, address) of one hospital.
    """
    hospital = hospitals_col.find_one({"hospitalId": hospital_id}, {"_id": 0})
    
    if not hospital:
        raise HTTPException(404, "Hospital not found")
        
    return hospital