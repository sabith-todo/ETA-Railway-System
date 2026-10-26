"""
Railway Track Section Monitoring API Endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException
from backend.app.database.db import get_db

router = APIRouter(prefix="/api/sections", tags=["Sections"])

@router.get("")
def list_sections(congestion: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        sql = "SELECT * FROM sections WHERE 1=1"
        params = []
        if congestion:
            sql += " AND congestion_level = ?"
            params.append(congestion)
            
        cursor.execute(sql, params)
        sections = [dict(r) for r in cursor.fetchall()]
        return {"count": len(sections), "sections": sections}

@router.get("/{section_id}/conditions")
def get_section_conditions(section_id: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sections WHERE id = ?", (section_id,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Section {section_id} not found.")
            
        cursor.execute("SELECT * FROM operational_events WHERE section_id = ? AND active = 1", (section_id,))
        events = [dict(r) for r in cursor.fetchall()]
        
        sec = dict(row)
        sec["active_events"] = events
        return sec
