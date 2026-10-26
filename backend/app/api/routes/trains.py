"""
Train Information & Dynamic ETA API Endpoints.
"""

import json
from datetime import datetime, date as dt_date, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from backend.app.database.db import get_db
from backend.app.services.data_provider import data_provider
from backend.app.services.live_rail_api import (
    fetch_live_train_status_from_api,
    fetch_railradar_gis_route
)
from backend.app.services.railway_service import railway_service
from backend.ml.predict import (
    calculate_dynamic_eta,
    propagate_delay_trajectory,
    calculate_operational_risk,
    predict_delay_minutes
)

router = APIRouter(prefix="/api/trains", tags=["Trains"])

COMMON_ALIASES = {
    # Tamil Nadu Cities & Stations
    "TRICHY": ["TPJ", "SRGM"],
    "TIRUCHIRAPPALLI": ["TPJ", "SRGM"],
    "TIRUCHI": ["TPJ", "SRGM"],
    "MADURAI": ["MDU", "TDN"],
    "CHENNAI": ["MAS", "MS", "TBM", "MSB", "PER"],
    "MADRAS": ["MAS", "MS", "TBM", "MSB", "PER"],
    "CENTRAL": ["MAS"],
    "EGMORE": ["MS"],
    "TAMBARAM": ["TBM"],
    "COIMBATORE": ["CBE", "CBF"],
    "KOVAI": ["CBE", "CBF"],
    "SALEM": ["SA", "SXT"],
    "ERODE": ["ED"],
    "TIRUPPUR": ["TUP"],
    "TIRUNELVELI": ["TEN"],
    "NELLAI": ["TEN"],
    "NAGERCOIL": ["NCJ"],
    "KANYAKUMARI": ["CAPE", "NCJ"],
    "CAPE": ["CAPE"],
    "RAMESWARAM": ["RMM"],
    "RAMNAD": ["RMD"],
    "RAMANATHAPURAM": ["RMD"],
    "DINDIGUL": ["DG"],
    "THANJAVUR": ["TJ"],
    "TANJORE": ["TJ"],
    "KUMBAKONAM": ["KMU"],
    "MAYILADUTHURAI": ["MV"],
    "CHIDAMBARAM": ["CDM"],
    "CUDDALORE": ["CUPJ", "TDPR"],
    "VILLUPURAM": ["VM"],
    "VRIDDHACHALAM": ["VRI"],
    "KATPADI": ["KPD", "VLR"],
    "VELLORE": ["KPD", "VLR"],
    "ARAKKONAM": ["AJJ"],
    "JOLARPETTAI": ["JTJ"],
    "METTUPALAYAM": ["MTP"],
    "OOTY": ["MTP"],
    "POLLACHI": ["POY"],
    "TUTICORIN": ["TN", "MEJ"],
    "THOOTHUKUDI": ["TN", "MEJ"],
    "TIRUCHENDUR": ["TCN"],
    "TENKASI": ["TSI"],
    "SENGOTTAI": ["SCT"],
    "RAJAPALAYAM": ["RJPM"],
    "SIVAKASI": ["TTL"],
    "VIRUDHUNAGAR": ["VPT"],
    "KARAIKKUDI": ["KKDI"],
    "PUDUKKOTTAI": ["PDKT"],
    "SIVAGANGA": ["SVGA"],
    "MANAMADURAI": ["MNM"],
    "KARUR": ["KRR"],
    "NAMAKKAL": ["NMKL"],
    "HOSUR": ["HSRA"],
    "DHARMAPURI": ["DPJ"],

    # Major National Cities & Hubs
    "DELHI": ["NDLS", "NZM", "DLI", "ANVT"],
    "NEW DELHI": ["NDLS", "NZM", "DLI", "ANVT"],
    "NIZAMUDDIN": ["NZM"],
    "ANAND VIHAR": ["ANVT"],
    "MUMBAI": ["MMCT", "CSMT", "BDTS", "LTT", "KYN"],
    "BOMBAY": ["MMCT", "CSMT", "BDTS", "LTT", "KYN"],
    "MUMBAI CENTRAL": ["MMCT"],
    "KOLKATA": ["HWH", "SDAH", "KOAA"],
    "CALCUTTA": ["HWH", "SDAH", "KOAA"],
    "HOWRAH": ["HWH"],
    "SEALDAH": ["SDAH"],
    "BANGALORE": ["SBC", "BNC", "KJM", "SMVB", "YPR"],
    "BENGALURU": ["SBC", "BNC", "KJM", "SMVB", "YPR"],
    "MYSURU": ["MYS"],
    "MYSORE": ["MYS"],
    "HYDERABAD": ["SC", "HYB", "KCG"],
    "SECUNDERABAD": ["SC", "HYB", "KCG"],
    "AHMEDABAD": ["ADI"],
    "PUNE": ["PUNE"],
    "JAIPUR": ["JP"],
    "BHOPAL": ["BPL", "RKMP"],
    "RANI KAMLAPATI": ["RKMP"],
    "NAGPUR": ["NGP"],
    "VIJAYAWADA": ["BZA"],
    "VISAKHAPATNAM": ["VSKP"],
    "VIZAG": ["VSKP"],
    "BHUBANESWAR": ["BBS"],
    "CUTTACK": ["CTC"],
    "LUCKNOW": ["LKO", "LJN"],
    "KANPUR": ["CNB"],
    "PRAYAGRAJ": ["PRYJ"],
    "ALLAHABAD": ["PRYJ"],
    "VARANASI": ["BSB", "DDU"],
    "BANARAS": ["BSB"],
    "PATNA": ["PNBE", "DNR"],
    "GORAKHPUR": ["GKP"],
    "GUWAHATI": ["GHY"],
    "SURAT": ["ST"],
    "VADODARA": ["BRC"],
    "BARODA": ["BRC"],
    "KOTA": ["KOTA"],
    "RATLAM": ["RTM"],
    "GWALIOR": ["GWL"],
    "JHANSI": ["VGLJ"],
    "AGRA": ["AGC"],
    "MATHURA": ["MTJ"],
    "ITARSI": ["ET"],
    "JABALPUR": ["JBP"],
    "AMRITSAR": ["ASR"],
    "LUDHIANA": ["LDH"],
    "AMBALA": ["UMB"],
    "JAMMU": ["JAT"],
    "KATRA": ["SVDK"],
    "GOA": ["MAO", "VSG"],
    "MADGAON": ["MAO"],
    "KOCHI": ["ERS", "ERN"],
    "COCHIN": ["ERS", "ERN"],
    "ERNAKULAM": ["ERS", "ERN"],
    "TRIVANDRUM": ["TVC"],
    "THIRUVANANTHAPURAM": ["TVC"],
    "PALAKKAD": ["PGT"],
    "KOZHIKODE": ["CLT"],
    "CALICUT": ["CLT"],
    "KANNUR": ["CAN"],
    "SHORANUR": ["SRR"],
    "THRISSUR": ["TCR"],
    "MANGALORE": ["MAQ", "MAJN"],
    "MANGALURU": ["MAQ", "MAJN"]
}

def resolve_station_codes(term: str, cursor) -> List[str]:
    """Resolves station codes by code, name, city, state, or common colloquial aliases."""
    term = term.strip()
    if not term:
        return []
    u_term = term.upper()
    codes = []
    
    # Check exact alias
    if u_term in COMMON_ALIASES:
        codes.extend(COMMON_ALIASES[u_term])
        
    # Check partial alias
    for k, v in COMMON_ALIASES.items():
        if k in u_term or u_term in k:
            codes.extend(v)
            
    cursor.execute("""
        SELECT code FROM stations 
        WHERE code = ? 
           OR UPPER(name) LIKE ? 
           OR UPPER(city) LIKE ? 
           OR UPPER(state) LIKE ?
    """, (u_term, f"%{u_term}%", f"%{u_term}%", f"%{u_term}%"))
    for r in cursor.fetchall():
        codes.append(r["code"])
        
    if not codes and len(term) in [2, 3, 4]:
        codes.append(u_term)
        
    # Deduplicate while preserving order
    seen = set()
    deduped = []
    for c in codes:
        if c not in seen:
            seen.add(c)
            deduped.append(c)
    return deduped

@router.get("")
def list_trains(
    search: Optional[str] = None,
    origin: Optional[str] = None,
    destination: Optional[str] = None,
    date: Optional[str] = None,
    limit: int = 100
):
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Parse natural language corridor search (e.g. "Chennai to Madurai", "MAS -> CBE", "Madurai - Chennai")
        if search:
            s_raw = search.strip()
            for sep in [" to ", " -> ", " - ", " ➔ ", " TO ", " To "]:
                if sep in s_raw:
                    parts = s_raw.split(sep, 1)
                    if not origin:
                        origin = parts[0].strip()
                    if not destination:
                        destination = parts[1].strip()
                    search = None
                    break
        
        today = dt_date.today()
        journey_dt = today
        is_future_date = False
        if date:
            try:
                journey_dt = datetime.strptime(date.strip(), "%Y-%m-%d").date()
                is_future_date = journey_dt > today
            except Exception:
                journey_dt = today
                is_future_date = False

        origin_codes = resolve_station_codes(origin, cursor) if origin else []
        dest_codes = resolve_station_codes(destination, cursor) if destination else []
        search_station_codes = resolve_station_codes(search, cursor) if search else []
        
        # Auto-resolve uncataloged train numbers or cataloged trains if queried
        if search:
            clean_digits = "".join(filter(str.isdigit, search))
            if len(clean_digits) in (4, 5):
                from backend.app.services.universal_train_engine import resolve_or_create_train
                try:
                    resolve_or_create_train(clean_digits)
                except Exception:
                    pass

        cursor.execute("SELECT code, name FROM stations")
        station_names = {r["code"]: r["name"] for r in cursor.fetchall()}
        
        cursor.execute("SELECT * FROM trains")
        all_trains = [dict(r) for r in cursor.fetchall()]
        
        cursor.execute("SELECT id, stations_json FROM routes")
        route_stations = {r["id"]: json.loads(r["stations_json"]) for r in cursor.fetchall()}
        
        matched_trains = []
        for t in all_trains:
            r_st = route_stations.get(t["route_id"], [])
            
            # 1. Search text filter (train number, name, type, or station)
            if search:
                s_term = search.strip().lower()
                num_match = s_term in t["number"].lower()
                name_match = s_term in t["name"].lower()
                type_match = s_term in t.get("type", "").lower()
                station_match = bool(search_station_codes and (
                    t["origin"] in search_station_codes 
                    or t["destination"] in search_station_codes 
                    or any(st in search_station_codes for st in r_st)
                ))
                if not (num_match or name_match or type_match or station_match):
                    continue
            
            # 2. Corridor Filter (From place A to place B)
            orig_idx = -1
            dest_idx = -1
            if origin_codes and dest_codes:
                # Must stop at an origin station, then subsequently at a destination station
                orig_idx = next((i for i, st in enumerate(r_st) if st in origin_codes), -1)
                dest_idx = next((i for i, st in enumerate(r_st) if st in dest_codes and (orig_idx == -1 or i > orig_idx)), -1)
                if orig_idx == -1 or dest_idx == -1 or orig_idx >= dest_idx:
                    # Also check direct origin/destination fields
                    if not (t["origin"] in origin_codes and t["destination"] in dest_codes):
                        continue
            elif origin_codes:
                # Must stop at origin or start there
                if not (t["origin"] in origin_codes or any(st in origin_codes for st in r_st)):
                    continue
            elif dest_codes:
                # Must stop at destination or end there
                if not (t["destination"] in dest_codes or any(st in dest_codes for st in r_st)):
                    continue
                    
            # Parse schedule & enrich with live railway metadata
            t_sched = []
            if t.get("schedule_json"):
                try:
                    t_sched = json.loads(t["schedule_json"])
                except Exception:
                    t_sched = []
            t["schedule"] = t_sched
            
            # Calculate specific boarding and debarking times and platforms
            boarding_time = t.get("departure_time", "--:--")
            debarking_time = t.get("arrival_time", "--:--")
            boarding_st_name = station_names.get(t["origin"], t["origin"])
            debarking_st_name = station_names.get(t["destination"], t["destination"])
            boarding_platform = "1"
            debarking_platform = "1"
            board_dist = 0
            debark_dist = t.get("total_distance_km", 0)
            
            board_entry = None
            debark_entry = None
            if origin_codes and t_sched:
                board_entry = next((s for s in t_sched if s["station_code"] in origin_codes), None)
                if board_entry:
                    boarding_time = board_entry.get("scheduled_departure", boarding_time)
                    boarding_st_name = board_entry.get("station_name", boarding_st_name)
                    boarding_platform = str(board_entry.get("platform", "1"))
                    board_dist = board_entry.get("distance_km", 0)
            elif t_sched:
                board_entry = t_sched[0]
                boarding_platform = str(board_entry.get("platform", "1"))
                    
            if dest_codes and t_sched:
                debark_entry = next((s for s in t_sched if s["station_code"] in dest_codes), None)
                if debark_entry:
                    debarking_time = debark_entry.get("scheduled_arrival", debarking_time)
                    debarking_st_name = debark_entry.get("station_name", debarking_st_name)
                    debarking_platform = str(debark_entry.get("platform", "1"))
                    debark_dist = debark_entry.get("distance_km", debark_dist)
            elif t_sched:
                debark_entry = t_sched[-1]
                debarking_platform = str(debark_entry.get("platform", "1"))
                debark_dist = debark_entry.get("distance_km", debark_dist)

            t["boarding_time"] = boarding_time
            t["debarking_time"] = debarking_time
            t["boarding_station_name"] = boarding_st_name
            t["debarking_station_name"] = debarking_st_name
            t["boarding_platform"] = boarding_platform
            t["debarking_platform"] = debarking_platform
            
            corridor_km = abs(debark_dist - board_dist) if debark_dist and board_dist else (t.get("total_distance_km") or 0)
            t["corridor_distance_km"] = corridor_km
            
            # Format departure, arrival, duration for journey date
            dep_formatted = boarding_time
            arr_formatted = debarking_time
            duration_str = ""
            if ":" in boarding_time and ":" in debarking_time:
                try:
                    bh, bm = map(int, boarding_time.split(":"))
                    dh, dm = map(int, debarking_time.split(":"))
                    b_dt = datetime.combine(journey_dt, datetime.min.time()) + timedelta(hours=bh, minutes=bm)
                    day_offset = 1 if (dh * 60 + dm) < (bh * 60 + bm) else 0
                    d_dt = datetime.combine(journey_dt + timedelta(days=day_offset), datetime.min.time()) + timedelta(hours=dh, minutes=dm)
                    diff = d_dt - b_dt
                    dur_h = int(diff.total_seconds() // 3600)
                    dur_m = int((diff.total_seconds() % 3600) // 60)
                    duration_str = f"{dur_h}h {dur_m:02d}m"
                    dep_formatted = f"{b_dt.strftime('%a, %d %b')} • {boarding_time}"
                    arr_formatted = f"{d_dt.strftime('%a, %d %b')} • {debarking_time}"
                except Exception:
                    pass
                    
            t["duration_formatted"] = duration_str or "--"
            t["departure_formatted"] = dep_formatted
            t["arrival_formatted"] = arr_formatted
            t["journey_date"] = journey_dt.strftime("%Y-%m-%d")
            t["is_future_date"] = is_future_date
            t["runs_daily"] = True
            t["runs_days"] = ["Daily"]
            t["service_status"] = "SCHEDULED" if is_future_date else "LIVE_RUNNING"
            
            # Next stop
            cur_idx = t.get("current_station_idx", 0)
            if r_st and cur_idx < len(r_st) - 1:
                t["next_station_code"] = r_st[cur_idx + 1]
                t["next_station_name"] = station_names.get(r_st[cur_idx + 1], r_st[cur_idx + 1])
            else:
                t["next_station_code"] = t["destination"]
                t["next_station_name"] = station_names.get(t["destination"], t["destination"])
                
            matched_trains.append(t)
            
        # Sort: priority trains first, then either delay (if today) or departure time (if future)
        matched_trains.sort(key=lambda x: (
            0 if x["number"] in ["12635", "12675", "20643", "12637", "12627"] else 1,
            -float(x["current_delay_min"]) if not is_future_date else x.get("departure_time", "99:99")
        ))
        
        result = matched_trains[:limit]
        return {
            "count": len(result),
            "total_matched": len(matched_trains),
            "journey_date": journey_dt.strftime("%Y-%m-%d"),
            "journey_date_formatted": journey_dt.strftime("%a, %d %b %Y"),
            "is_future_date": is_future_date,
            "trains": result
        }

@router.get("/search")
def search_trains(q: str = Query("", description="Train number or train name"), limit: int = 25):
    """
    Search trains by train number or train name with instant debounce support.
    Returns: Train number, Train name, Source, Destination, Train type.
    """
    results = railway_service.search_trains(q, limit=limit)
    return {
        "query": q,
        "count": len(results),
        "trains": results
    }

@router.get("/network/live-stats")
def get_live_network_stats():
    """
    Returns authentic live network status summary:
    Trains Running, On Time, Delayed, High Risk.
    Does not use fake statistics.
    """
    from backend.app.database.db import get_session
    from backend.app.database.models import Train
    with get_session() as session:
        all_trains = session.query(Train).all()
        if not all_trains:
            return {
                "available": False,
                "message": "Live network data unavailable"
            }
        running = len(all_trains)
        on_time = sum(1 for t in all_trains if (t.current_delay_min or 0.0) <= 5.0)
        delayed = sum(1 for t in all_trains if (t.current_delay_min or 0.0) > 5.0)
        high_risk = sum(1 for t in all_trains if str(t.risk_level).upper() == "HIGH" or (t.current_delay_min or 0.0) > 25.0)

        return {
            "available": True,
            "trains_running": running,
            "on_time": on_time,
            "delayed": delayed,
            "high_risk": high_risk,
            "as_of": datetime.utcnow().isoformat()
        }

@router.get("/{train_id}")
def get_train_details(train_id: str, date: Optional[str] = None):
    train = data_provider.get_train(train_id)
    if not train:
        raise HTTPException(status_code=404, detail=f"Train {train_id} not found.")
    today = dt_date.today()
    journey_dt = today
    is_future_date = False
    if date:
        try:
            journey_dt = datetime.strptime(date.strip(), "%Y-%m-%d").date()
            is_future_date = journey_dt > today
        except Exception:
            journey_dt = today
            is_future_date = False

    # Real physical location from live NTES/IRCTC feed
    if not is_future_date:
        try:
            live = fetch_live_train_status_from_api(train_id)
            if live:
                train["current_location"] = live["current_location"]
                train["current_delay_min"] = live["current_delay_min"]
                train["current_speed_kmh"] = live["current_speed_kmh"]
                if live.get("current_lat") and live.get("current_lon"):
                    train["current_lat"] = live["current_lat"]
                    train["current_lon"] = live["current_lon"]
                if live.get("next_station_name"):
                    train["next_station_name"] = live["next_station_name"]
                train["status_as_of"] = live.get("status_as_of", "Live NTES")
                train["raw_source"] = "IRCTC_NTES_LIVE"
        except Exception:
            pass

    train["journey_date"] = journey_dt.strftime("%Y-%m-%d")
    train["journey_date_formatted"] = journey_dt.strftime("%a, %d %b %Y")
    train["is_future_date"] = is_future_date
    train["service_status"] = "SCHEDULED" if is_future_date else "LIVE_RUNNING"

    curr_delay = float(train.get("current_delay_min", 0.0))
    prev_delay = float(train.get("previous_station_delay_min", curr_delay))
    curr_speed = float(train.get("current_speed_kmh", 75.0))
    sched_arrival = train.get("arrival_time", "18:30")
    total_dist = float(train.get("total_distance_km", 500.0))

    pred_delay = predict_delay_minutes(
        train_number=train_id,
        station_sequence=int(train.get("current_station_idx", 0)) + 1,
        remaining_distance=total_dist * 0.4,
        current_delay=curr_delay,
        previous_station_delay=prev_delay,
        current_speed=curr_speed
    )

    dynamic_eta = calculate_dynamic_eta(
        scheduled_time_str=sched_arrival,
        remaining_distance_km=total_dist * 0.4,
        current_speed_kmh=curr_speed,
        current_delay_min=curr_delay,
        predicted_delay_min=pred_delay
    )

    risk_info = calculate_operational_risk(
        current_delay=curr_delay,
        previous_delay=prev_delay,
        current_speed=curr_speed
    )

    train["scheduled_eta"] = dynamic_eta["scheduled_eta"]
    train["ai_predicted_eta"] = dynamic_eta["ai_predicted_eta"]
    train["baseline_eta"] = dynamic_eta["baseline_eta"]
    train["predicted_delay_min"] = dynamic_eta["predicted_delay_min"]
    train["difference"] = dynamic_eta["difference"]
    train["risk_analysis"] = risk_info
    train["data_source"] = "LIVE" if not is_future_date and bool(train.get("current_lat")) else "SCHEDULED"
    return train

@router.get("/{train_id}/route")
def get_train_route(train_id: str, date: Optional[str] = None):
    train = data_provider.get_train(train_id)
    if not train:
        raise HTTPException(status_code=404, detail=f"Train {train_id} not found.")
        
    today = dt_date.today()
    journey_dt = today
    is_future_date = False
    if date:
        try:
            journey_dt = datetime.strptime(date.strip(), "%Y-%m-%d").date()
            is_future_date = journey_dt > today
        except Exception:
            journey_dt = today
            is_future_date = False

    # Fetch live physical train progression from IRCTC API
    live = None
    if not is_future_date:
        try:
            live = fetch_live_train_status_from_api(train_id)
        except Exception:
            live = None

    # Fetch RailRadar GIS route if available
    gis_route = None
    try:
        gis_route = fetch_railradar_gis_route(train_id)
    except Exception:
        gis_route = None

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT code, name, city, state, lat, lon, platforms FROM stations")
        station_map = {r["code"]: dict(r) for r in cursor.fetchall()}
        
    route_stations = train.get("route_stations", [])
    route_distances = train.get("route_distances", [])
    cur_idx = train.get("current_station_idx", 0)
    current_delay = float(train.get("current_delay_min", 0.0))
    schedule_lookup = {s["station_code"]: s for s in train.get("schedule", [])}

    # If live data is available, compute passed vs current vs upcoming from real NTES
    live_up_map = {}
    live_prev_codes = set()
    cur_stn_code = ""
    if live and not is_future_date:
        cur_stn_code = live.get("current_station_code", "")
        current_delay = float(live.get("current_delay_min", current_delay))
        live_up_map = {s["station_code"]: s for s in live.get("upcoming_stations", [])}
        live_prev_codes = {s["station_code"] for s in live.get("previous_stations", [])}
        
        # Match current station index in route
        if cur_stn_code in route_stations:
            cur_idx = route_stations.index(cur_stn_code)
    
    timeline = []
    for idx, st_code in enumerate(route_stations):
        st_info = station_map.get(st_code, {"name": st_code, "city": "", "platforms": 2})
        dist = route_distances[idx] if idx < len(route_distances) else 0
        sched_entry = schedule_lookup.get(st_code, {})
        
        sched_arr = sched_entry.get("scheduled_arrival", "--:--")
        sched_dep = sched_entry.get("scheduled_departure", "--:--")
        platform = sched_entry.get("platform", str(st_info.get("platforms", 2)))
        day = sched_entry.get("day", 1)
        
        if is_future_date:
            # Future journey: not yet departed
            status = "Upcoming"
            st_delay = 0
            pred_arr = sched_arr
            is_cur = False
        else:
            if live and live_prev_codes and st_code in live_prev_codes:
                status = "Passed"
                st_delay = 0
                is_cur = False
                pred_arr = sched_arr
            elif live and cur_stn_code and st_code == cur_stn_code:
                status = "Current"
                st_delay = int(round(current_delay))
                is_cur = True
                pred_arr = sched_arr
            elif idx < cur_idx:
                status = "Passed"
                st_delay = 0
                is_cur = False
                pred_arr = sched_arr
            elif idx == cur_idx:
                status = "Current"
                st_delay = int(round(current_delay))
                is_cur = True
                pred_arr = sched_arr
            else:
                status = "Upcoming"
                is_cur = False
                st_delay = max(0, int(round(current_delay + (idx - cur_idx) * 0.5)))
                pred_arr = sched_arr
                if sched_arr != "--:--" and ":" in sched_arr:
                    try:
                        sh, sm = map(int, sched_arr.split(":"))
                        tot_m = (sh * 60 + sm + st_delay) % (24 * 60)
                        pred_arr = f"{tot_m // 60:02d}:{tot_m % 60:02d}"
                    except Exception:
                        pred_arr = sched_arr

            # Enrich from live NTES upcoming station if available
            if st_code in live_up_map:
                up_item = live_up_map[st_code]
                if up_item.get("predicted_arrival") and up_item["predicted_arrival"] != "--:--":
                    pred_arr = up_item["predicted_arrival"]
                if up_item.get("platform"):
                    platform = str(up_item["platform"])
                if "delay_minutes" in up_item:
                    st_delay = up_item["delay_minutes"]

        timeline.append({
            "station_code": st_code,
            "station_name": st_info.get("name", st_code),
            "city": st_info.get("city", ""),
            "lat": st_info.get("lat"),
            "lon": st_info.get("lon"),
            "distance_km": dist,
            "platforms": st_info.get("platforms", 2),
            "platform": platform,
            "scheduled_arrival": sched_arr,
            "scheduled_departure": sched_dep,
            "predicted_arrival": pred_arr,
            "delay_minutes": st_delay,
            "day": day,
            "status": status,
            "is_current": is_cur
        })
        
    geojson = railway_service.get_train_route(train_id)
    return {
        "type": "FeatureCollection",
        "features": geojson.get("features", []),
        "geojson": geojson,
        "train_id": train["number"],
        "train_name": train["name"],
        "route_id": train["route_id"],
        "route_name": train.get("route_name", ""),
        "current_station_index": cur_idx if not is_future_date else 0,
        "journey_date": journey_dt.strftime("%Y-%m-%d"),
        "is_future_date": is_future_date,
        "live_telemetry_connected": bool(live),
        "gis_route": gis_route or geojson,
        "stations": timeline
    }

@router.get("/{train_id}/position")
def get_train_position(train_id: str):
    pos = data_provider.get_train_position(train_id)
    if not pos:
        raise HTTPException(status_code=404, detail=f"Train {train_id} not found.")
    return pos

@router.get("/{train_id}/eta")
def get_train_eta(train_id: str):
    eta = data_provider.get_dynamic_eta(train_id)
    if not eta:
        raise HTTPException(status_code=404, detail=f"Train {train_id} not found or route data missing.")
    return eta

@router.get("/{train_id}/forecast")
def get_train_forecast(train_id: str):
    eta = data_provider.get_dynamic_eta(train_id)
    if not eta:
        raise HTTPException(status_code=404, detail=f"Train {train_id} not found.")
        
    # Build chart progression points (Station -> Predicted Delay)
    delay_progression = []
    for st in eta["stations"]:
        delay_progression.append({
            "station_code": st["station_code"],
            "station_name": st.get("station_name", st["station_code"]),
            "distance_km": st["distance_from_origin_km"],
            "delay_minutes": st["delay_minutes"],
            "confidence_percent": st["confidence_percent"],
            "scheduled": st["scheduled_eta"],
            "predicted": st["predicted_eta"]
        })
        
    return {
        "train_id": eta["train_id"],
        "train_name": eta["train_name"],
        "current_delay_minutes": eta["current_delay_minutes"],
        "predicted_destination_delay_minutes": eta["predicted_destination_delay_minutes"],
        "expected_additional_delay_minutes": eta["expected_additional_delay_minutes"],
        "recovery_info": eta["recovery_info"],
        "delay_contributors": eta["delay_contributors"],
        "total_predicted_impact_minutes": eta["total_predicted_impact_minutes"],
        "delay_progression": delay_progression,
        "prediction_source": eta["prediction_source"],
        "last_updated": eta["last_updated"]
    }

@router.get("/{train_id}/schedule")
def get_train_schedule(train_id: str):
    """Returns complete ordered station timetable stops for the train."""
    schedule = railway_service.get_train_schedule(train_id)
    if not schedule:
        tr = data_provider.get_train(train_id)
        if tr and tr.get("schedule"):
            return tr["schedule"]
        raise HTTPException(status_code=404, detail=f"Schedule for train {train_id} not found.")
    return schedule

@router.get("/{train_id}/live")
def get_train_live_status(train_id: str):
    """
    Returns live train tracking telemetry:
    latitude, longitude, speed, bearing, current_station, next_station, delay, last_updated, data_source.
    """
    live_status = railway_service.get_live_train_status(train_id)
    return live_status

@router.get("/{train_id}/predictions")
def get_train_predictions(train_id: str):
    """
    Returns station-wise predicted arrival, delay propagation, confidence, and operational risk analysis.
    """
    tr = railway_service.get_train(train_id) or data_provider.get_train(train_id)
    if not tr:
        raise HTTPException(status_code=404, detail=f"Train {train_id} not found.")

    schedule = railway_service.get_train_schedule(train_id)
    cur_delay = float(tr.get("current_delay", tr.get("current_delay_min", 0.0)))
    cur_idx = int(tr.get("current_station_idx", 0))
    cur_speed = float(tr.get("current_speed", tr.get("current_speed_kmh", 75.0)))
    prev_delay = float(tr.get("previous_station_delay_min", cur_delay))

    trajectory = propagate_delay_trajectory(
        train_number=train_id,
        current_delay_min=cur_delay,
        current_station_idx=cur_idx,
        schedule=schedule,
        current_speed=cur_speed
    )

    risk_analysis = calculate_operational_risk(
        current_delay=cur_delay,
        previous_delay=prev_delay,
        current_speed=cur_speed
    )

    sched_arr = tr.get("arrival_time", "18:30")
    total_dist = float(tr.get("total_distance_km", 500.0))
    dest_pred_delay = trajectory[-1]["delay_min"] if trajectory else cur_delay

    dynamic_eta = calculate_dynamic_eta(
        scheduled_time_str=sched_arr,
        remaining_distance_km=total_dist * 0.3,
        current_speed_kmh=cur_speed,
        current_delay_min=cur_delay,
        predicted_delay_min=dest_pred_delay
    )

    return {
        "train_number": train_id,
        "train_name": tr.get("name"),
        "current_station": tr.get("current_station", tr.get("current_location")),
        "current_delay_min": cur_delay,
        "eta": dynamic_eta,
        "risk_analysis": risk_analysis,
        "station_predictions": trajectory
    }

