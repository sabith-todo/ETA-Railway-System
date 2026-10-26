"""
Railway Data Service Abstraction Layer.
Handles train metadata, schedules, GIS routes, station searches, and real-time train tracking.
Implements the required fallback hierarchy:
    LIVE API -> Cached / Last-Known Data -> Scheduled Master Timetable
"""

import json
import logging
import os
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

from backend.app.database.db import get_session, get_db
from backend.app.database.models import Train, Station, TrainStop
from backend.app.services.live_rail_api import (
    fetch_live_train_status_from_api,
    fetch_railradar_gis_route,
    _live_status_cache
)

logger = logging.getLogger("railway_service")

RAILWAY_API_BASE_URL = os.getenv("RAILWAY_API_BASE_URL", "https://api.railway.example.com")
RAILWAY_API_KEY = os.getenv("RAILWAY_API_KEY", "")

class RailwayService:
    """Abstraction layer for railway APIs and fallback data sources."""

    def __init__(self):
        self.api_base_url = RAILWAY_API_BASE_URL
        self.api_key = RAILWAY_API_KEY

    def search_trains(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Searches trains by train number or train name (case-insensitive).
        Returns a list of matching trains.
        """
        q = (query or "").strip().lower()
        if not q:
            return []

        results = []
        with get_session() as session:
            trains = session.query(Train).all()
            for t in trains:
                if q in t.number.lower() or q in t.name.lower() or q in t.origin.lower() or q in t.destination.lower():
                    results.append({
                        "number": t.number,
                        "name": t.name,
                        "origin": t.origin,
                        "destination": t.destination,
                        "type": t.type,
                        "status": t.status,
                        "current_delay_min": t.current_delay_min,
                        "departure_time": t.departure_time,
                        "arrival_time": t.arrival_time
                    })
                    if len(results) >= limit:
                        break
        return results

    def search_stations(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Searches stations by code, name, city, or state.
        """
        q = (query or "").strip().lower()
        if not q:
            return []

        results = []
        with get_session() as session:
            stations = session.query(Station).all()
            for s in stations:
                if (q == s.code.lower() or 
                    q in s.name.lower() or 
                    q in s.city.lower() or 
                    q in s.state.lower()):
                    results.append(s.to_dict())
                    if len(results) >= limit:
                        break
        return results

    def get_station(self, station_code: str) -> Optional[Dict[str, Any]]:
        """Retrieves station metadata by station code."""
        code = (station_code or "").strip().upper()
        with get_session() as session:
            st = session.query(Station).filter(Station.code == code).first()
            if st:
                return st.to_dict()
        return None

    def get_train(self, train_number: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves train master information, combining DB state with latest live status if available.
        """
        num = (train_number or "").strip()
        with get_session() as session:
            train = session.query(Train).filter(Train.number == num).first()
            if not train:
                return None
            train_dict = train.to_dict()

        # Check for live status fallback
        live_info = self.get_live_train_status(num)
        if live_info and live_info.get("status_available", False):
            train_dict["current_station"] = live_info.get("current_station", train_dict.get("current_location"))
            train_dict["next_station"] = live_info.get("next_station", "")
            train_dict["current_speed"] = live_info.get("speed", train_dict.get("current_speed_kmh"))
            train_dict["current_delay"] = live_info.get("delay", train_dict.get("current_delay_min"))
            train_dict["current_lat"] = live_info.get("latitude")
            train_dict["current_lon"] = live_info.get("longitude")
            train_dict["bearing"] = live_info.get("bearing", 0.0)
            train_dict["data_source"] = live_info.get("data_source", "SCHEDULED")
            train_dict["last_updated"] = live_info.get("last_updated")

        return train_dict

    def get_train_schedule(self, train_number: str) -> List[Dict[str, Any]]:
        """
        Returns full ordered train timetable stops.
        """
        num = (train_number or "").strip()
        with get_session() as session:
            stops = (
                session.query(TrainStop)
                .filter(TrainStop.train_number == num)
                .order_by(TrainStop.stop_sequence.asc())
                .all()
            )
            if stops:
                schedule = []
                for s in stops:
                    st_dict = s.to_dict()
                    # attach station full name
                    station = session.query(Station).filter(Station.code == s.station_code).first()
                    st_dict["station_name"] = station.name if station else s.station_code
                    schedule.append(st_dict)
                return schedule

            # Fallback to schedule_json in Train
            train = session.query(Train).filter(Train.number == num).first()
            if train and train.schedule_json:
                try:
                    raw_schedule = json.loads(train.schedule_json)
                    return raw_schedule
                except Exception:
                    pass

        return []

    def get_train_route(self, train_number: str) -> Dict[str, Any]:
        """
        Returns authentic GeoJSON FeatureCollection for railway route geometry,
        including LineString tracks (completed segment vs remaining segment)
        and Station Point markers.
        """
        num = (train_number or "").strip()
        train_data = self.get_train(num)
        if not train_data:
            return {"type": "FeatureCollection", "features": []}

        # Check RailRadar GIS Route cache first
        gis_route = fetch_railradar_gis_route(num)
        if gis_route and gis_route.get("features"):
            return gis_route

        # Construct GeoJSON from route stations and raw coordinates
        schedule = self.get_train_schedule(num)
        if not schedule:
            return {"type": "FeatureCollection", "features": []}

        coordinates = []
        station_features = []
        current_idx = train_data.get("current_station_idx", 0)

        with get_session() as session:
            for idx, stop in enumerate(schedule):
                code = stop.get("station_code", stop.get("station", stop.get("code")))
                st = session.query(Station).filter(Station.code == code).first()
                if st:
                    pt = [st.lon, st.lat]
                    coordinates.append(pt)
                    station_features.append({
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": pt},
                        "properties": {
                            "station_code": st.code,
                            "station_name": st.name,
                            "city": st.city,
                            "sequence": idx + 1,
                            "scheduled_arrival": stop.get("scheduled_arrival"),
                            "scheduled_departure": stop.get("scheduled_departure"),
                            "platform": stop.get("platform", "1"),
                            "passed": idx <= current_idx
                        }
                    })

        if not coordinates:
            return {"type": "FeatureCollection", "features": []}

        # Split into completed and remaining routes
        split_at = max(1, min(current_idx + 1, len(coordinates)))
        completed_coords = coordinates[:split_at]
        remaining_coords = coordinates[max(0, split_at - 1):]

        features = [
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": completed_coords},
                "properties": {
                    "segment": "completed",
                    "style": {"color": "#64748B", "weight": 4, "dashArray": "5, 5"}
                }
            },
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": remaining_coords},
                "properties": {
                    "segment": "remaining",
                    "style": {"color": "#0284C7", "weight": 5}
                }
            }
        ]
        features.extend(station_features)

        return {
            "type": "FeatureCollection",
            "properties": {
                "train_number": num,
                "train_name": train_data.get("name"),
                "total_stations": len(station_features),
                "current_station_index": current_idx
            },
            "features": features
        }

    def get_live_train_status(self, train_number: str) -> Dict[str, Any]:
        """
        Executes strict fallback hierarchy:
        1. Live External API (RapidAPI / NTES / CRIS)
        2. Cached / Last Known Telemetry
        3. Scheduled Master Timetable
        """
        num = (train_number or "").strip()
        now_ts = datetime.utcnow()

        # Step 1: Attempt Live API Fetch
        live_api_result = fetch_live_train_status_from_api(num)
        if live_api_result and live_api_result.get("status_available", False):
            return {
                "status_available": True,
                "train_number": num,
                "latitude": live_api_result.get("current_lat"),
                "longitude": live_api_result.get("current_lon"),
                "speed": live_api_result.get("current_speed_kmh", 0.0),
                "bearing": live_api_result.get("bearing", 0.0),
                "current_station": live_api_result.get("current_station_name") or live_api_result.get("current_station"),
                "next_station": live_api_result.get("next_station_name") or live_api_result.get("next_station"),
                "delay": live_api_result.get("current_delay_min", 0.0),
                "data_source": "LIVE",
                "last_updated": now_ts.isoformat(),
                "updated_seconds_ago": 0,
                "message": f"Updated live from telemetry"
            }

        # Step 2: Fallback to Cached / Last Known telemetry
        if num in _live_status_cache:
            cache_entry = _live_status_cache[num]
            data = cache_entry.get("data", {})
            age_sec = int(time.time() - cache_entry.get("timestamp", time.time()))
            cur_st = data.get("current_station") or data.get("current_station_name")
            next_st = data.get("next_station") or data.get("next_station_name")
            if not cur_st:
                with get_session() as session:
                    tr = session.query(Train).filter(Train.number == num).first()
                    if tr:
                        cur_st = tr.current_location or tr.origin
                        next_st = next_st or tr.destination

            return {
                "status_available": True,
                "train_number": num,
                "latitude": data.get("current_lat"),
                "longitude": data.get("current_lon"),
                "speed": data.get("current_speed_kmh", 0.0),
                "bearing": data.get("bearing", 0.0),
                "current_station": cur_st,
                "next_station": next_st,
                "delay": data.get("current_delay_min", 0.0),
                "data_source": "LAST KNOWN",
                "last_updated": data.get("updated_at", now_ts.isoformat()),
                "updated_seconds_ago": max(age_sec, 15),
                "message": f"Using last known telemetry from cache ({max(age_sec, 15)}s ago)"
            }

        # Step 3: Fallback to Master Schedule in DB
        with get_session() as session:
            train = session.query(Train).filter(Train.number == num).first()
            if train:
                return {
                    "status_available": True,
                    "train_number": num,
                    "latitude": train.current_lat,
                    "longitude": train.current_lon,
                    "speed": train.current_speed_kmh,
                    "bearing": 0.0,
                    "current_station": train.current_location or train.origin,
                    "next_station": train.destination,
                    "delay": train.current_delay_min,
                    "data_source": "SCHEDULED",
                    "last_updated": train.last_updated.isoformat() if train.last_updated else now_ts.isoformat(),
                    "updated_seconds_ago": 300,
                    "message": "Live telemetry unavailable. Displaying scheduled timetable information."
                }

        # If train completely not found
        return {
            "status_available": False,
            "train_number": num,
            "data_source": "DATA UNAVAILABLE",
            "message": "Live train position and telemetry unavailable"
        }

railway_service = RailwayService()
