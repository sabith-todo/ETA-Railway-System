"""
Saved / Favourite Trains & Stations API Endpoints.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional

from backend.app.database.db import get_session
from backend.app.database.models import SavedTrain, Train, Station
from backend.app.services.railway_service import railway_service

router = APIRouter(prefix="/api/saved", tags=["Saved / Favourites"])

class SaveTrainRequest(BaseModel):
    train_number: str
    custom_label: Optional[str] = None
    user_id: str = "default_user"

@router.get("/trains")
def get_saved_trains(user_id: str = Query("default_user")):
    """Retrieves all saved trains for the user, enriched with current live status and ETA."""
    with get_session() as session:
        records = session.query(SavedTrain).filter(SavedTrain.user_id == user_id).all()
        saved_list = [{"id": r.id, "train_number": r.train_number, "custom_label": r.custom_label} for r in records]

    results = []
    for item in saved_list:
        train_info = railway_service.get_train(item["train_number"])
        if train_info:
            train_info["saved_id"] = item["id"]
            train_info["custom_label"] = item["custom_label"]
            results.append(train_info)
        else:
            results.append({
                "saved_id": item["id"],
                "number": item["train_number"],
                "name": item["custom_label"] or f"Train {item['train_number']}",
                "status": "DATA UNAVAILABLE",
                "origin": "",
                "destination": ""
            })
    return results

@router.post("/trains")
def save_train(req: SaveTrainRequest):
    """Saves a train to user favourites."""
    num = req.train_number.strip()
    with get_session() as session:
        existing = session.query(SavedTrain).filter(
            SavedTrain.user_id == req.user_id,
            SavedTrain.train_number == num
        ).first()
        if existing:
            existing.custom_label = req.custom_label or existing.custom_label
            session.commit()
            return {"status": "updated", "saved_train": existing.to_dict()}

        new_saved = SavedTrain(
            user_id=req.user_id,
            train_number=num,
            custom_label=req.custom_label
        )
        session.add(new_saved)
        session.commit()
        return {"status": "saved", "saved_train": new_saved.to_dict()}

@router.delete("/trains/{train_number}")
def remove_saved_train(train_number: str, user_id: str = Query("default_user")):
    """Removes a train from user favourites."""
    num = train_number.strip()
    with get_session() as session:
        existing = session.query(SavedTrain).filter(
            SavedTrain.user_id == user_id,
            SavedTrain.train_number == num
        ).first()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Train {num} not in saved list")
        session.delete(existing)
        session.commit()
        return {"status": "removed", "train_number": num}
