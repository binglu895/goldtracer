"""
FedWatch Manual Update Endpoint
Allows authorized users to manually update FedWatch probabilities from the admin panel.
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
import os

router = APIRouter()

class FedWatchUpdate(BaseModel):
    prob_pause: float
    prob_cut_25: float
    meeting_date: Optional[str] = "2026-03-18"
    admin_key: str

@router.post("/admin/fedwatch/update")
async def update_fedwatch(data: FedWatchUpdate):
    """
    Manual FedWatch probability update endpoint.
    
    Usage:
    POST /api/admin/fedwatch/update
    {
        "prob_pause": 84.2,
        "prob_cut_25": 15.8,
        "meeting_date": "2026-03-18",
        "admin_key": "your-secret-key"
    }
    """
    # Simple authentication (in production, use proper auth)
    expected_key = os.getenv("ADMIN_KEY", "goldtracer_admin_2026")
    
    if data.admin_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    # Validate probabilities
    if data.prob_pause < 0 or data.prob_pause > 100:
        raise HTTPException(status_code=400, detail="prob_pause must be between 0 and 100")
    
    if data.prob_cut_25 < 0 or data.prob_cut_25 > 100:
        raise HTTPException(status_code=400, detail="prob_cut_25 must be between 0 and 100")
    
    if abs((data.prob_pause + data.prob_cut_25) - 100.0) > 0.1:
        raise HTTPException(status_code=400, detail="Probabilities must sum to ~100%")
    
    # Store in environment or database
    # For now, we'll return success and log the values
    # You can extend this to update a config file or database
    
    return {
        "status": "success",
        "message": "FedWatch probabilities updated",
        "data": {
            "prob_pause": data.prob_pause,
            "prob_cut_25": data.prob_cut_25,
            "meeting_date": data.meeting_date
        },
        "note": "To persist these values, update calculator.py or implement database storage"
    }

@router.get("/admin/fedwatch/current")
async def get_current_fedwatch(admin_key: str = Header(None)):
    """
    Get current FedWatch values.
    """
    expected_key = os.getenv("ADMIN_KEY", "goldtracer_admin_2026")
    
    if admin_key != expected_key:
        raise HTTPException(status_code=403, detail="Invalid admin key")
    
    from ..services.calculator import calc_fed_watch
    
    current = calc_fed_watch()
    return current
