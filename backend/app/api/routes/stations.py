"""
Station Directory & Live Arrivals API Endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.database.db import get_db
from backend.app.services.data_provider import data_provider

router = APIRouter(prefix="/api/stations", tags=["Stations"])

@router.get("")
def list_stations(query: Optional[str] = None, zone: Optional[str] = None):
    with get_db() as conn:
        cursor = conn.cursor()
        sql = "SELECT * FROM stations WHERE 1=1"
        params = []
        if query:
            sql += " AND (code LIKE ? OR name LIKE ? OR city LIKE ?)"
            params.extend([f"%{query}%", f"%{query}%", f"%{query}%"])
        if zone:
            sql += " AND zone = ?"
            params.append(zone)
            
        sql += " ORDER BY name ASC"
        cursor.execute(sql, params)
        stations = [dict(r) for r in cursor.fetchall()]
        return {"count": len(stations), "stations": stations}

@router.get("/search")
def search_stations(q: str = Query("", description="Station code, name, city, or state"), limit: int = 25):
    """Search stations by code, name, city, or state."""
    from backend.app.services.railway_service import railway_service
    results = railway_service.search_stations(q, limit=limit)
    return {"query": q, "count": len(results), "stations": results}

@router.get("/{station_code}")
def get_station_details(station_code: str):
    st_c = station_code.strip().upper()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM stations WHERE code = ?", (st_c,))
        row = cursor.fetchone()
        if not row:
            from backend.app.services.universal_train_engine import get_station_metadata
            meta = get_station_metadata(st_c)
            if meta:
                cursor.execute("""
                INSERT OR REPLACE INTO stations (code, name, city, state, lat, lon, platforms, zone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (meta["code"], meta["name"], meta["city"], meta["state"], meta["lat"], meta["lon"], meta["platforms"], meta.get("zone", "IR")))
                conn.commit()
                return meta
            raise HTTPException(status_code=404, detail=f"Station {station_code} not found.")
        return dict(row)

@router.get("/{station_code}/arrivals")
def get_station_arrivals(station_code: str):
    arrivals = data_provider.get_station_arrivals(station_code.upper())
    return {
        "station_code": station_code.upper(),
        "arrivals_count": len(arrivals),
        "arrivals": arrivals
    }

@router.get("/{station_code}/live-board")
def get_station_live_board(station_code: str, window_hours: int = Query(default=8, ge=0, le=24)):
    """
    'Where Is My Train' Live Station Board API.
    Returns all trains arriving at or departing from this station with platform numbers,
    delay status, expected times, and operational tracking.
    """
    st_code = station_code.strip().upper()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT code, name, city, state, platforms FROM stations WHERE code = ?", (st_code,))
        st_row = cursor.fetchone()
        if not st_row:
            from backend.app.services.universal_train_engine import get_station_metadata
            meta = get_station_metadata(st_code)
            if meta:
                cursor.execute("""
                INSERT OR REPLACE INTO stations (code, name, city, state, lat, lon, platforms, zone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (meta["code"], meta["name"], meta["city"], meta["state"], meta["lat"], meta["lon"], meta["platforms"], meta.get("zone", "IR")))
                conn.commit()
                st_row = meta
            else:
                raise HTTPException(status_code=404, detail=f"Station {st_code} not found.")
        station_info = dict(st_row)

        cursor.execute("SELECT code, name FROM stations")
        all_station_names = {r["code"]: r["name"] for r in cursor.fetchall()}

        cursor.execute("SELECT * FROM trains")
        all_trains = [dict(r) for r in cursor.fetchall()]

    import json
    from datetime import datetime, timedelta

    board_trains = []
    now = datetime.now()
    cur_mins = now.hour * 60 + now.minute

    for t in all_trains:
        schedule = []
        if t.get("schedule_json"):
            try:
                schedule = json.loads(t["schedule_json"])
            except Exception:
                schedule = []

        stop_entry = None
        stop_idx = -1
        for idx, entry in enumerate(schedule):
            if entry.get("station_code") == st_code:
                stop_entry = entry
                stop_idx = idx
                break

        if not stop_entry:
            # Check origin or destination match
            if t.get("origin") == st_code:
                sched_dep = t.get("departure_time", "--:--")
                sched_arr = "--:--"
                pf = "1"
                stop_idx = 0
            elif t.get("destination") == st_code:
                sched_dep = "--:--"
                sched_arr = t.get("arrival_time", "--:--")
                pf = "1"
                stop_idx = 999
            else:
                continue
        else:
            sched_arr = stop_entry.get("scheduled_arrival", "--:--")
            sched_dep = stop_entry.get("scheduled_departure", "--:--")
            pf = str(stop_entry.get("platform", "1"))

        is_origin = (t.get("origin") == st_code) or (stop_idx == 0)
        is_dest = (t.get("destination") == st_code) or (schedule and stop_idx == len(schedule) - 1)

        primary_time_str = sched_dep if not is_dest else sched_arr
        delay_min = int(round(float(t.get("current_delay_min", 0.0))))

        pred_time_str = primary_time_str
        if primary_time_str != "--:--" and ":" in primary_time_str:
            try:
                h, m = map(int, primary_time_str.split(":"))
                tot = (h * 60 + m + delay_min) % (24 * 60)
                pred_time_str = f"{tot // 60:02d}:{tot % 60:02d}"
            except Exception:
                pred_time_str = primary_time_str

        # Operational status relative to this station
        cur_station_idx = t.get("current_station_idx", 0)
        if cur_station_idx > stop_idx and stop_idx != -1:
            op_status = "Departed"
            badge_color = "gray"
        elif cur_station_idx == stop_idx and stop_idx != -1:
            op_status = "At Platform"
            badge_color = "emerald"
        else:
            op_status = "Approaching"
            badge_color = "amber" if delay_min > 5 else "blue"

        # Time window filtering if window_hours > 0
        if window_hours > 0 and primary_time_str != "--:--" and ":" in primary_time_str:
            try:
                ph, pm = map(int, pred_time_str.split(":"))
                pred_tot = ph * 60 + pm
                diff_min = (pred_tot - cur_mins) % (24 * 60)
                # If window is exceeded, omit (allow up to 60m in the past for recently departed)
                if diff_min > window_hours * 60 and diff_min < (24 * 60 - 60):
                    continue
            except Exception:
                pass

        board_trains.append({
            "train_number": t["number"],
            "train_name": t["name"],
            "train_type": t.get("type", "Express"),
            "origin_code": t["origin"],
            "origin_name": all_station_names.get(t["origin"], t["origin"]),
            "destination_code": t["destination"],
            "destination_name": all_station_names.get(t["destination"], t["destination"]),
            "scheduled_arrival": sched_arr,
            "scheduled_departure": sched_dep,
            "primary_time": primary_time_str,
            "predicted_time": pred_time_str,
            "delay_minutes": delay_min,
            "platform": pf,
            "is_origin": is_origin,
            "is_destination": is_dest,
            "operational_status": op_status,
            "badge_color": badge_color,
            "current_location": t.get("current_location", "En Route"),
            "current_speed_kmh": t.get("current_speed_kmh", 0),
        })

    # Sort trains by predicted arrival/departure time
    board_trains.sort(key=lambda x: x["predicted_time"])

    return {
        "station_code": st_code,
        "station_name": station_info.get("name", st_code),
        "city": station_info.get("city", ""),
        "platforms_count": station_info.get("platforms", 2),
        "query_window_hours": window_hours,
        "board_time": now.strftime("%H:%M"),
        "total_trains": len(board_trains),
        "trains": board_trains
    }
