"""
Real-time Railway Simulation Engine for SIH Problem Statement 26028.
Simulates train progression, GPS interpolation, dynamic event injection,
downstream delay propagation, delay recovery, and real-time WebSocket dispatch.
"""

import asyncio
import json
import random
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))
from backend.app.database.db import get_db
from backend.app.websocket.manager import ws_manager
from backend.app.services.data_provider import data_provider
from ml.predictor import predictor

class RailwaySimulationEngine:
    def __init__(self):
        self.is_running = False
        self.tick_interval_seconds = 5
        self.time_multiplier = 1 # 1x, 2x, 5x
        self.task: Optional[asyncio.Task] = None
        self.active_events: List[Dict[str, Any]] = []
        self.event_history: List[Dict[str, Any]] = []
        self.last_tick_time = datetime.now()
        
    async def start(self):
        if not self.is_running:
            self.is_running = True
            self.task = asyncio.create_task(self._simulation_loop())
            print("Railway Simulation Engine started.")
            await ws_manager.broadcast({
                "type": "SIM_STATUS",
                "data": {"is_running": True, "time_multiplier": self.time_multiplier}
            })
            return {"status": "started", "interval_sec": self.tick_interval_seconds, "multiplier": self.time_multiplier}
        return {"status": "already_running"}
        
    async def pause(self):
        if self.is_running:
            self.is_running = False
            if self.task:
                self.task.cancel()
                self.task = None
            print("Railway Simulation Engine paused.")
            await ws_manager.broadcast({
                "type": "SIM_STATUS",
                "data": {"is_running": False, "time_multiplier": self.time_multiplier}
            })
            return {"status": "paused"}
        return {"status": "already_paused"}
        
    async def reset(self):
        await self.pause()
        # Reset trains to initial demo state
        with get_db() as conn:
            cursor = conn.cursor()
            # Clear events
            cursor.execute("DELETE FROM operational_events")
            
            # Reset 12627 Karnataka Express demo values
            cursor.execute("""
            UPDATE trains SET
                current_station_idx = 7,
                current_location = 'Approaching Salem Jn',
                current_lat = 11.6643,
                current_lon = 78.1460,
                current_speed_kmh = 74.0,
                current_delay_min = 18.0,
                previous_station_delay_min = 16.0,
                status = 'Delayed (+18m)',
                risk_level = 'Moderate'
            WHERE number = '12627'
            """)
            
            # Reset sections
            cursor.execute("""
            UPDATE sections SET
                congestion_level = 'low',
                has_speed_restriction = 0,
                speed_restriction_kmh = NULL,
                weather_condition = 'clear'
            """)
            conn.commit()
            
        self.active_events.clear()
        print("Railway Simulation Engine reset to baseline.")
        
        # Broadcast reset to all connected clients
        await ws_manager.broadcast({
            "type": "SIM_RESET",
            "data": {
                "message": "Simulation reset to baseline (+18m delay on Train 12627)",
                "train_id": "12627",
                "timestamp": datetime.now().isoformat()
            }
        })
        
        return {"status": "reset_to_baseline"}

    async def set_multiplier(self, multiplier: int):
        self.time_multiplier = max(1, min(10, multiplier))
        await ws_manager.broadcast({
            "type": "SIM_STATUS",
            "data": {"is_running": self.is_running, "time_multiplier": self.time_multiplier}
        })
        return {"status": "ok", "time_multiplier": self.time_multiplier}

    async def inject_event(self, event_type: str, train_id: str = "12627", 
                           section_id: str = "SEC_SA_ED", description: str = "", 
                           impact_minutes: float = 10.0, severity: str = "Moderate") -> dict:
        """
        Injects a dynamic operational event, updates train and section conditions,
        recalculates dynamic ETAs, models downstream ripples, and broadcasts updates.
        """
        event_id = f"EVT_{int(datetime.now().timestamp() * 1000)}"
        
        if not description:
            desc_map = {
                "signal_delay": f"Signal hold due to junction interlocking on {section_id}",
                "congestion": f"Heavy train traffic congestion detected between {section_id}",
                "speed_restriction": f"Temporary Speed Restriction (TSR 30 km/h) on track maintenance zone",
                "unscheduled_stop": f"Unscheduled halt for track clearance / crossing at signal",
                "heavy_rain": f"Heavy monsoon rainfall & reduced visibility on {section_id}",
                "clear_conditions": f"Signal cleared and track restrictions lifted on {section_id}",
                "delay_recovery": f"Priority green corridor granted - dynamic delay recovery in progress"
            }
            description = desc_map.get(event_type, f"Operational disturbance on {section_id}")

        # Update database state
        with get_db() as conn:
            cursor = conn.cursor()
            
            if event_type == "clear_conditions":
                # Clear active events for this section/train
                cursor.execute("UPDATE operational_events SET active = 0 WHERE section_id = ? OR train_id = ?", 
                               (section_id, train_id))
                cursor.execute("""
                UPDATE sections SET
                    congestion_level = 'low',
                    has_speed_restriction = 0,
                    speed_restriction_kmh = NULL,
                    weather_condition = 'clear'
                WHERE id = ?
                """, (section_id,))
                
                # Boost speed and trigger recovery
                cursor.execute("""
                UPDATE trains SET
                    current_speed_kmh = max_speed,
                    previous_station_delay_min = current_delay_min,
                    current_delay_min = MAX(0, current_delay_min - 4.0),
                    status = 'Recovering'
                WHERE number = ?
                """, (train_id,))
                
            elif event_type == "delay_recovery":
                cursor.execute("""
                UPDATE trains SET
                    previous_station_delay_min = current_delay_min,
                    current_delay_min = MAX(0, current_delay_min - 5.0),
                    current_speed_kmh = 95.0,
                    status = 'Recovering Time'
                WHERE number = ?
                """, (train_id,))
                
            else:
                # Record event
                cursor.execute("""
                INSERT INTO operational_events (id, train_id, section_id, event_type, description, severity, impact_minutes, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                """, (event_id, train_id, section_id, event_type, description, severity, impact_minutes))
                
                # Apply section changes
                if event_type in ["congestion", "signal_delay"]:
                    cursor.execute("UPDATE sections SET congestion_level = 'high' WHERE id = ?", (section_id,))
                elif event_type == "speed_restriction":
                    cursor.execute("UPDATE sections SET has_speed_restriction = 1, speed_restriction_kmh = 35.0 WHERE id = ?", (section_id,))
                elif event_type == "heavy_rain":
                    cursor.execute("UPDATE sections SET weather_condition = 'heavy_rain' WHERE id = ?", (section_id,))

                # Directly alter target train delay & speed
                cursor.execute("SELECT current_delay_min, current_speed_kmh FROM trains WHERE number = ?", (train_id,))
                t_row = cursor.fetchone()
                if t_row:
                    old_delay = t_row["current_delay_min"]
                    new_delay = old_delay + impact_minutes
                    new_speed = 35.0 if event_type in ["congestion", "speed_restriction"] else 55.0
                    risk = "Severe" if new_delay > 45 else ("High" if new_delay > 25 else "Moderate")
                    status = f"Delayed (+{int(new_delay)}m)"
                    cursor.execute("""
                    UPDATE trains SET 
                        previous_station_delay_min = ?,
                        current_delay_min = ?,
                        current_speed_kmh = ?,
                        status = ?,
                        risk_level = ?
                    WHERE number = ?
                    """, (old_delay, new_delay, new_speed, status, risk, train_id))
                    
            conn.commit()

        # Recalculate dynamic ETA
        eta_updated = data_provider.get_dynamic_eta(train_id)
        
        # Model Downstream Network Ripple Effect
        downstream_affected_trains = self._calculate_downstream_ripple(train_id, section_id, impact_minutes)
        
        event_payload = {
            "id": event_id,
            "event_type": event_type,
            "train_id": train_id,
            "section_id": section_id,
            "description": description,
            "impact_minutes": impact_minutes,
            "severity": severity,
            "timestamp": datetime.now().isoformat(),
            "updated_eta": eta_updated,
            "downstream_ripple": downstream_affected_trains
        }
        
        self.active_events.append(event_payload)
        self.event_history.insert(0, event_payload)
        
        # Broadcast via WebSocket
        await ws_manager.broadcast({
            "type": "EVENT_INJECTED",
            "data": event_payload
        })
        
        return event_payload

    def _calculate_downstream_ripple(self, primary_train_id: str, section_id: str, delay_added: float) -> List[Dict[str, Any]]:
        """
        Simulates how a delay to primary train cascades into trailing trains in the same corridor.
        """
        affected = []
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM trains WHERE number != ?", (primary_train_id,))
            other_trains = [dict(r) for r in cursor.fetchall()]
            
        # If primary train is 12627, find trailing trains (e.g. 12675, 12679)
        for t in other_trains[:3]:
            # Cascade a fraction of delay to trailing trains (e.g. 40-60%)
            cascaded_delay = round(delay_added * random.uniform(0.35, 0.65), 1)
            new_delay = t["current_delay_min"] + cascaded_delay
            affected.append({
                "train_id": t["number"],
                "train_name": t["name"],
                "induced_delay_minutes": cascaded_delay,
                "new_delay_minutes": round(new_delay, 1),
                "cause": f"Precedence hold behind Train {primary_train_id} on {section_id}"
            })
        return affected

    async def _simulation_loop(self):
        """Asynchronous continuous simulation loop updating positions and delays."""
        while self.is_running:
            try:
                await asyncio.sleep(self.tick_interval_seconds)
                await self._process_tick()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in simulation loop: {e}")
                await asyncio.sleep(self.tick_interval_seconds)

    async def _process_tick(self):
        """Executes a single simulation tick."""
        updated_trains = []
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM trains")
            trains = [dict(r) for r in cursor.fetchall()]
            
            cursor.execute("SELECT * FROM routes")
            routes = {r["id"]: dict(r) for r in cursor.fetchall()}
            
            cursor.execute("SELECT code, lat, lon, name FROM stations")
            st_coords = {r["code"]: (r["lat"], r["lon"], r["name"]) for r in cursor.fetchall()}
            
            import json
            for r in routes.values():
                r["stations"] = json.loads(r["stations_json"])
                r["distances"] = json.loads(r["distances_json"])

            for t in trains:
                r = routes.get(t["route_id"])
                if not r:
                    continue
                
                stations = r["stations"]
                distances = r["distances"]
                cur_idx = t["current_station_idx"]
                
                # Check if train has arrived at destination
                if cur_idx >= len(stations) - 1:
                    last_st = stations[-1]
                    lat_d, lon_d, name_d = st_coords.get(last_st, (11.0, 77.0, last_st))
                    updated_trains.append({
                        "number": t["number"],
                        "name": t["name"],
                        "lat": lat_d,
                        "lon": lon_d,
                        "speed_kmh": 0.0,
                        "location": f"Terminated at {name_d}",
                        "delay_min": t["current_delay_min"],
                        "status": "Arrived at Destination"
                    })
                    continue
                    
                cur_st = stations[cur_idx]
                next_st = stations[cur_idx + 1]
                
                lat1, lon1, name1 = st_coords.get(cur_st, (13.0, 80.0, cur_st))
                lat2, lon2, name2 = st_coords.get(next_st, (13.1, 80.1, next_st))
                
                # Calculate section distance
                if cur_idx + 1 < len(distances) and cur_idx < len(distances):
                    sec_dist_km = max(5.0, float(distances[cur_idx + 1] - distances[cur_idx]))
                else:
                    sec_dist_km = 45.0

                # Current speed with operational variations
                cur_speed = float(t["current_speed_kmh"])
                max_spd = float(t["max_speed"])
                cur_speed = max(35.0, min(max_spd, cur_speed + random.uniform(-1.5, 1.5)))

                # Determine current progress along section [0.0, 1.0]
                dx = lat2 - lat1
                dy = lon2 - lon1
                len_sq = dx * dx + dy * dy
                
                curr_lat = t.get("current_lat")
                curr_lon = t.get("current_lon")
                
                if curr_lat and curr_lon and len_sq > 0.000001:
                    px = curr_lat - lat1
                    py = curr_lon - lon1
                    u = (px * dx + py * dy) / len_sq
                    u = max(0.0, min(0.98, u))
                else:
                    u = 0.05

                # Move forward based on speed and time multiplier
                # Step progress along section
                step_progress = max(0.015 * self.time_multiplier, (cur_speed * self.tick_interval_seconds * self.time_multiplier / 3600.0) / sec_dist_km)
                new_u = u + step_progress

                # Handle delay and station progression
                new_delay = float(t["current_delay_min"])
                
                # Dynamic Delay Recovery: if train is late and running fast, gradually recover delay
                if new_delay > 0 and cur_speed >= 70.0:
                    recover_amount = 0.1 * self.time_multiplier
                    new_delay = max(0.0, round(new_delay - recover_amount, 1))

                if new_u >= 1.0:
                    # Train advances to next station
                    new_idx = cur_idx + 1
                    if new_idx >= len(stations) - 1:
                        new_lat, new_lon = lat2, lon2
                        new_loc = f"Arrived at {name2} (Terminus)"
                        status = "Arrived at Destination"
                    else:
                        new_lat, new_lon = lat2, lon2
                        next_next = stations[min(new_idx + 1, len(stations) - 1)]
                        new_loc = f"Departed {name2}, en route to {next_next}"
                        status = "On Time" if new_delay <= 5 else f"Delayed (+{int(new_delay)}m)"
                else:
                    new_idx = cur_idx
                    new_lat = lat1 + new_u * dx + random.uniform(-0.0004, 0.0004)
                    new_lon = lon1 + new_u * dy + random.uniform(-0.0004, 0.0004)
                    rem_dist = max(1.0, round((1.0 - new_u) * sec_dist_km, 1))
                    past_dist = max(1.0, round(new_u * sec_dist_km, 1))
                    if new_u < 0.25:
                        new_loc = f"Departed {name1} • {past_dist} km to {name2}"
                    elif new_u > 0.8:
                        new_loc = f"Approaching {name2} • {rem_dist} km to arrival"
                    else:
                        new_loc = f"Near {name2} • {rem_dist} km remaining • Speed {int(cur_speed)} km/h"
                    status = "On Time" if new_delay <= 5 else f"Delayed (+{int(new_delay)}m)"

                # Update train in database
                cursor.execute("""
                UPDATE trains SET
                    current_station_idx = ?,
                    current_lat = ?,
                    current_lon = ?,
                    current_speed_kmh = ?,
                    current_location = ?,
                    current_delay_min = ?,
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE number = ?
                """, (new_idx, round(new_lat, 4), round(new_lon, 4), round(cur_speed, 1), 
                      new_loc, round(new_delay, 1), status, t["number"]))
                
                train_payload = {
                    "number": t["number"],
                    "name": t["name"],
                    "lat": round(new_lat, 4),
                    "lon": round(new_lon, 4),
                    "speed_kmh": round(cur_speed, 1),
                    "location": new_loc,
                    "delay_min": round(new_delay, 1),
                    "status": status,
                    "station_idx": new_idx
                }
                
                # Priority: place showcase train 12627 at index 0
                if t["number"] == "12627":
                    updated_trains.insert(0, train_payload)
                else:
                    updated_trains.append(train_payload)
                    
            conn.commit()

        # Broadcast tick to frontend
        await ws_manager.broadcast({
            "type": "SIM_TICK",
            "data": {
                "timestamp": datetime.now().isoformat(),
                "active_trains_count": len(updated_trains),
                "trains": updated_trains # Full fleet broadcast
            }
        })

sim_engine = RailwaySimulationEngine()
