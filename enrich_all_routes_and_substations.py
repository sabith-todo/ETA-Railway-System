"""
Enriches all 66 railway routes and train schedules in routes.json, trains.json,
and the SQLite database with complete suburban and intermediate sub-stations across Tamil Nadu.
"""

import json
import os
import sqlite3
import math
from datetime import datetime

ROOT_DIR = os.path.dirname(__file__)
ROUTES_JSON = os.path.join(ROOT_DIR, "data", "raw", "routes.json")
TRAINS_JSON = os.path.join(ROOT_DIR, "data", "raw", "trains.json")
STATIONS_JSON = os.path.join(ROOT_DIR, "data", "raw", "stations.json")
DB_PATH = os.path.join(ROOT_DIR, "backend", "railway_eta.db")

# Complete ordered sequences of stations for main corridor spines:
# 1. Chennai Egmore to Madurai & Kanyakumari
CHORD_LINE_SOUTH = [
    "MS", "MSF", "MPK", "MSC", "NBK", "MKK", "MBM", "SP", "GDY", "STM", "PZA", "MN", "TLM", "PV", "CMP",
    "TBM", "TBMS", "PRGL", "VDR", "UPM", "GI", "POTI", "CTM", "MMNK", "SKL", "PWU",
    "CGL", "OV", "PALR", "KGZ", "MMK", "ACK", "TZD", "OLA", "PCLM", "MYP", "PEI", "VVN", "MYX",
    "VM", "PRKL", "ULU", "VRI", "PNDM", "MTUR", "SNDI", "ALU", "KKPM", "PMB", "LLI", "SRGM", "TPTN", "GOC",
    "TPJ", "PUG", "MPA", "VPJ", "AYR", "VDM", "DG", "KQN", "VDP", "SDN", "KON",
    "MDU", "TMQ", "KGD", "VPT", "TY", "SRT", "CVP", "KDU", "MEJ", "GDN",
    "TEN", "SGLM", "NNN", "VLY", "AAY", "NCJ", "CAPE"
]

# 2. Chennai Central to Katpadi, Salem, Coimbatore
WEST_LINE = [
    "MAS", "MASS", "BBQ", "VPY", "PER", "PCW", "PEW", "VLK", "KOTR", "PVM", "ABU", "TMVL", "ANNR",
    "AVD", "HC", "PAB", "NEC", "TI", "VEU", "SVR", "PTLR", "TRL", "EGT", "KBT", "SPAM", "MAF", "TO", "MSU", "PLMG",
    "AJJ", "SHU", "WJR", "MCN", "KPD", "GYM", "VN", "JTJ", "TPT", "MAP", "BQI",
    "SA", "DC", "SGE", "ED", "CV", "PY", "VZ", "UKL", "TUP", "SNO", "SUU", "IGU", "PLMD", "CBF", "CBE"
]

# 3. Salem to Bengaluru Corridor
SALEM_BANGALORE_LINE = [
    "SA", "OML", "DPJ", "HSRA", "CRLM", "BYPL", "KJM", "BNC", "SBC"
]

# 4. Chennai to Bengaluru Corridor
CHENNAI_BANGALORE_LINE = [
    "MAS", "PER", "AVD", "TRL", "AJJ", "SHU", "WJR", "KPD", "GYM", "VN", "JTJ", "KPN", "BWT", "KJM", "BNC", "SBC", "MYS"
]

# 5. Delta Line: Villupuram -> Mayiladuthurai -> Thanjavur -> Trichy
DELTA_LINE = [
    "VM", "TDPR", "CUPJ", "CDM", "SY", "VDL", "MV", "KTM", "ADT", "KMU", "PML", "TJ", "BAL", "TRB", "TPJ"
]

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def time_to_min(t_str):
    try:
        p = t_str.split(":")
        return int(p[0]) * 60 + int(p[1])
    except:
        return 0

def min_to_time(mins):
    m = mins % (24 * 60)
    return f"{m // 60:02d}:{m % 60:02d}"

def geo_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

def find_spine_subsequence(start_code, end_code):
    spines = [CHORD_LINE_SOUTH, WEST_LINE, SALEM_BANGALORE_LINE, CHENNAI_BANGALORE_LINE, DELTA_LINE]
    for spine in spines:
        if start_code in spine and end_code in spine:
            i1 = spine.index(start_code)
            i2 = spine.index(end_code)
            if i1 < i2:
                return spine[i1:i2+1]
            else:
                return spine[i2:i1+1][::-1]
    return None

def main():
    print("Starting comprehensive sub-station route enrichment...")
    stations_data = load_json(STATIONS_JSON)
    st_map = {s["code"]: s for s in stations_data}
    
    # Ensure BNC and essential stations are in stations.json
    essential_stations = [
        {"code": "BNC", "name": "Bengaluru Cantonment", "city": "Bengaluru", "state": "Karnataka", "lat": 12.9937, "lon": 77.5983, "platforms": 4, "zone": "SWR"},
        {"code": "KJM", "name": "Krishnarajapuram", "city": "Bengaluru", "state": "Karnataka", "lat": 13.0012, "lon": 77.6881, "platforms": 4, "zone": "SWR"},
        {"code": "BWT", "name": "Bangarapet Jn", "city": "Kolar", "state": "Karnataka", "lat": 12.9961, "lon": 78.2036, "platforms": 5, "zone": "SWR"},
        {"code": "BYPL", "name": "Baiyyappanahalli", "city": "Bengaluru", "state": "Karnataka", "lat": 12.9917, "lon": 77.6533, "platforms": 3, "zone": "SWR"},
        {"code": "CRLM", "name": "Karmelaram", "city": "Bengaluru", "state": "Karnataka", "lat": 12.9150, "lon": 77.7117, "platforms": 2, "zone": "SWR"},
        {"code": "OML", "name": "Omalur Jn", "city": "Salem", "state": "Tamil Nadu", "lat": 11.7383, "lon": 78.0417, "platforms": 2, "zone": "SR"},
        {"code": "SGE", "name": "Sankaridurg", "city": "Salem", "state": "Tamil Nadu", "lat": 11.4883, "lon": 77.8717, "platforms": 3, "zone": "SR"},
        {"code": "BQI", "name": "Bommidi", "city": "Dharmapuri", "state": "Tamil Nadu", "lat": 11.9883, "lon": 78.2617, "platforms": 2, "zone": "SR"},
        {"code": "KPN", "name": "Kuppam", "city": "Chittoor", "state": "Andhra Pradesh", "lat": 12.7517, "lon": 78.3617, "platforms": 3, "zone": "SWR"},
    ]
    for es in essential_stations:
        if es["code"] not in st_map:
            stations_data.append(es)
            st_map[es["code"]] = es
            
    save_json(STATIONS_JSON, stations_data)
    print(f"Verified stations catalog: {len(stations_data)} total stations.")

    routes = load_json(ROUTES_JSON)
    trains = load_json(TRAINS_JSON)
    
    routes_map = {r["id"]: r for r in routes}
    
    # Enrich routes with sub-stations
    enriched_routes_count = 0
    for r in routes:
        old_stations = r["stations"]
        if len(old_stations) < 2:
            continue
            
        start_code = old_stations[0]
        end_code = old_stations[-1]
        
        # Check if route can be enriched via spine
        new_stations = []
        for i in range(len(old_stations) - 1):
            s1 = old_stations[i]
            s2 = old_stations[i+1]
            sub = find_spine_subsequence(s1, s2)
            if sub and len(sub) > 2:
                if not new_stations:
                    new_stations.extend(sub)
                else:
                    new_stations.extend(sub[1:])
            else:
                if not new_stations:
                    new_stations.extend([s1, s2])
                else:
                    new_stations.append(s2)
                    
        # Filter to existing valid station objects
        valid_stations = [code for code in new_stations if code in st_map]
        
        # Calculate realistic cumulative distances
        distances = [0.0]
        cur_dist = 0.0
        for idx in range(len(valid_stations) - 1):
            c1 = valid_stations[idx]
            c2 = valid_stations[idx + 1]
            st1 = st_map[c1]
            st2 = st_map[c2]
            seg_km = geo_distance(st1["lat"], st1["lon"], st2["lat"], st2["lon"])
            # Highway/rail curving factor
            seg_km = max(1.5, round(seg_km * 1.18, 1))
            cur_dist = round(cur_dist + seg_km, 1)
            distances.append(cur_dist)
            
        r["stations"] = valid_stations
        r["distances"] = distances
        routes_map[r["id"]] = r
        enriched_routes_count += 1

    save_json(ROUTES_JSON, routes)
    print(f"Successfully enriched {enriched_routes_count} routes in routes.json.")

    # Now enrich all 66 train schedules
    enriched_trains_count = 0
    for t in trains:
        r_id = t.get("route_id")
        r = routes_map.get(r_id)
        if not r:
            continue
            
        r_stations = r["stations"]
        r_distances = r["distances"]
        
        dep_str = t.get("departure_time", "06:00")
        arr_str = t.get("arrival_time", "21:00")
        dep_min = time_to_min(dep_str)
        arr_min = time_to_min(arr_str)
        
        crosses_midnight = arr_min < dep_min
        total_span = (arr_min + 24 * 60 - dep_min) if crosses_midnight else (arr_min - dep_min)
        total_span = max(30, total_span)
        total_dist = max(10.0, r_distances[-1])
        
        t["total_distance_km"] = total_dist
        t["route_stations"] = r_stations
        t["route_distances"] = r_distances
        
        # Build enriched schedule list
        schedule = []
        for idx, sc in enumerate(r_stations):
            dist = r_distances[idx]
            frac = dist / total_dist
            stop_min = int(dep_min + frac * total_span)
            
            arr_t = min_to_time(stop_min)
            # Intermediate dwell 1-3 mins
            dwell = 0 if idx in (0, len(r_stations) - 1) else (3 if sc in ["TPJ", "DG", "SA", "ED", "CGL", "VM", "AJJ", "KPD"] else 1)
            dep_t = min_to_time(stop_min + dwell)
            
            st_info = st_map.get(sc, {})
            platform = str((hash(sc + t["number"]) % max(1, st_info.get("platforms", 4))) + 1)
            
            schedule.append({
                "station_code": sc,
                "station_name": st_info.get("name", sc),
                "scheduled_arrival": arr_t if idx > 0 else dep_str,
                "scheduled_departure": dep_t if idx < len(r_stations) - 1 else arr_str,
                "platform": platform,
                "distance_km": dist,
                "day": 2 if crosses_midnight and stop_min >= (24 * 60) else 1
            })
            
        t["schedule_json"] = json.dumps(schedule)
        enriched_trains_count += 1

    save_json(TRAINS_JSON, trains)
    print(f"Successfully enriched {enriched_trains_count} train schedules in trains.json.")

    # Re-populate SQLite database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Update stations
    for s in stations_data:
        cursor.execute("""
        INSERT OR REPLACE INTO stations (code, name, city, state, lat, lon, platforms, zone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (s["code"], s["name"], s["city"], s["state"], s["lat"], s["lon"], s.get("platforms", 2), s.get("zone", "SR")))
        
    # 2. Update routes
    for r in routes:
        cursor.execute("""
        INSERT OR REPLACE INTO routes (id, name, stations_json, distances_json)
        VALUES (?, ?, ?, ?)
        """, (r["id"], r["name"], json.dumps(r["stations"]), json.dumps(r["distances"])))
        
    # 3. Update trains
    for t in trains:
        cursor.execute("""
        UPDATE trains 
        SET schedule_json = ?, total_distance_km = ?
        WHERE number = ?
        """, (t["schedule_json"], t["total_distance_km"], t["number"]))
        
    conn.commit()
    print("Committed all routes, sub-stations, and train schedules into SQLite database.")
    
    cursor.execute("SELECT count(*) FROM stations")
    print(f"Total Stations in DB: {cursor.fetchone()[0]}")
    cursor.execute("SELECT count(*) FROM routes")
    print(f"Total Routes in DB: {cursor.fetchone()[0]}")
    conn.close()

if __name__ == "__main__":
    main()
