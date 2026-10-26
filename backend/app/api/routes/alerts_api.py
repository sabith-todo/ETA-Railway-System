"""
Alerts & Notifications API Endpoints for RailForecastAI.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional

from backend.app.database.db import get_session
from backend.app.database.models import AlertItem, Train

router = APIRouter(prefix="/api/alerts", tags=["Alerts & Notifications"])

class CreateAlertRequest(BaseModel):
    train_number: str
    alert_type: str = "DELAY_INCREASED"  # DELAY_INCREASED, ETA_CHANGED, APPROACHING_STATION, STATUS_CHANGED
    message: str
    threshold_min: float = 10.0
    user_id: str = "default_user"

@router.get("")
def get_alerts(user_id: str = Query("default_user")):
    """Retrieves all active alerts and notifications for the user."""
    with get_session() as session:
        alerts = (
            session.query(AlertItem)
            .filter(AlertItem.user_id == user_id)
            .order_by(AlertItem.created_at.desc())
            .all()
        )
        return [a.to_dict() for a in alerts]

@router.post("")
def create_alert(req: CreateAlertRequest):
    """Creates a notification / alert rule for a train."""
    with get_session() as session:
        alert = AlertItem(
            train_number=req.train_number.strip(),
            user_id=req.user_id,
            alert_type=req.alert_type,
            message=req.message,
            threshold_min=req.threshold_min,
            is_triggered=True
        )
        session.add(alert)
        session.commit()
        return {"status": "created", "alert": alert.to_dict()}

@router.delete("/{alert_id}")
def dismiss_alert(alert_id: int):
    """Dismisses an alert notification."""
    with get_session() as session:
        alert = session.query(AlertItem).filter(AlertItem.id == alert_id).first()
        if not alert:
            raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found")
        session.delete(alert)
        session.commit()
        return {"status": "dismissed", "alert_id": alert_id}
