"""
Synthetic Railway Operational Data Generator for SIH Problem Statement 26028.
Generates realistic Indian Railway networks, routes, stations, trains, and operational runs
with multi-factor delay dynamics, congestion, weather, and speed restrictions.
"""

import json
import math
import os
import random
from datetime import datetime, timedelta

# Major Indian Railway Stations across Key Corridors
STATIONS_DATA = [
    # Southern Corridor (Chennai - Coimbatore / Bangalore)
    {"code": "MAS", "name": "Chennai Central", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2707, "platforms": 12, "zone": "SR"},
    {"code": "AJJ", "name": "Arakkonam Jn", "city": "Arakkonam", "state": "Tamil Nadu", "lat": 13.0783, "lon": 79.6677, "platforms": 5, "zone": "SR"},
    {"code": "KPD", "name": "Katpadi Jn", "city": "Vellore", "state": "Tamil Nadu", "lat": 12.9698, "lon": 79.1378, "platforms": 5, "zone": "SR"},
    {"code": "AB", "name": "Ambur", "city": "Ambur", "state": "Tamil Nadu", "lat": 12.7889, "lon": 78.7144, "platforms": 3, "zone": "SR"},
    {"code": "VN", "name": "Vaniyambadi", "city": "Vaniyambadi", "state": "Tamil Nadu", "lat": 12.6865, "lon": 78.6186, "platforms": 3, "zone": "SR"},
    {"code": "JTJ", "name": "Jolarpettai Jn", "city": "Jolarpettai", "state": "Tamil Nadu", "lat": 12.5583, "lon": 78.5772, "platforms": 5, "zone": "SR"},
    {"code": "TPT", "name": "Tirupattur", "city": "Tirupattur", "state": "Tamil Nadu", "lat": 12.4937, "lon": 78.5684, "platforms": 2, "zone": "SR"},
    {"code": "MAP", "name": "Morappur", "city": "Morappur", "state": "Tamil Nadu", "lat": 12.1284, "lon": 78.3976, "platforms": 2, "zone": "SR"},
    {"code": "SA", "name": "Salem Jn", "city": "Salem", "state": "Tamil Nadu", "lat": 11.6643, "lon": 78.1460, "platforms": 6, "zone": "SR"},
    {"code": "SGE", "name": "Sankaridurg", "city": "Sankari", "state": "Tamil Nadu", "lat": 11.4822, "lon": 77.8683, "platforms": 2, "zone": "SR"},
    {"code": "ED", "name": "Erode Jn", "city": "Erode", "state": "Tamil Nadu", "lat": 11.3410, "lon": 77.7172, "platforms": 4, "zone": "SR"},
    {"code": "TUP", "name": "Tiruppur", "city": "Tiruppur", "state": "Tamil Nadu", "lat": 11.1085, "lon": 77.3411, "platforms": 2, "zone": "SR"},
    {"code": "CBF", "name": "Coimbatore North", "city": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0183, "lon": 76.9558, "platforms": 2, "zone": "SR"},
    {"code": "CBE", "name": "Coimbatore Jn", "city": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0016, "lon": 76.9629, "platforms": 6, "zone": "SR"},
    
    # Bangalore Extension
    {"code": "BWT", "name": "Bangarapet Jn", "city": "Bangarapet", "state": "Karnataka", "lat": 12.9833, "lon": 78.1833, "platforms": 4, "zone": "SWR"},
    {"code": "KJM", "name": "Krishnarajapuram", "city": "Bengaluru", "state": "Karnataka", "lat": 12.9972, "lon": 77.6833, "platforms": 4, "zone": "SWR"},
    {"code": "BNC", "name": "Bengaluru Cantt", "city": "Bengaluru", "state": "Karnataka", "lat": 12.9934, "lon": 77.5982, "platforms": 3, "zone": "SWR"},
    {"code": "SBC", "name": "KSR Bengaluru", "city": "Bengaluru", "state": "Karnataka", "lat": 12.9781, "lon": 77.5694, "platforms": 10, "zone": "SWR"},

    # North-South Trunk (Delhi - Bhopal - Nagpur - Chennai / Karnataka Express 12627)
    {"code": "NDLS", "name": "New Delhi", "city": "New Delhi", "state": "Delhi", "lat": 28.6139, "lon": 77.2090, "platforms": 16, "zone": "NR"},
    {"code": "NZM", "name": "Hazrat Nizamuddin", "city": "New Delhi", "state": "Delhi", "lat": 28.5889, "lon": 77.2533, "platforms": 8, "zone": "NR"},
    {"code": "MTJ", "name": "Mathura Jn", "city": "Mathura", "state": "Uttar Pradesh", "lat": 27.4924, "lon": 77.6737, "platforms": 10, "zone": "NCR"},
    {"code": "AGC", "name": "Agra Cantt", "city": "Agra", "state": "Uttar Pradesh", "lat": 27.1583, "lon": 77.9908, "platforms": 6, "zone": "NCR"},
    {"code": "GWL", "name": "Gwalior Jn", "city": "Gwalior", "state": "Madhya Pradesh", "lat": 26.2183, "lon": 78.1828, "platforms": 5, "zone": "NCR"},
    {"code": "VGLJ", "name": "V Lakshmibai Jhansi", "city": "Jhansi", "state": "Uttar Pradesh", "lat": 25.4484, "lon": 78.5685, "platforms": 8, "zone": "NCR"},
    {"code": "BINA", "name": "Bina Jn", "city": "Bina", "state": "Madhya Pradesh", "lat": 24.1802, "lon": 78.1834, "platforms": 5, "zone": "WCR"},
    {"code": "BPL", "name": "Bhopal Jn", "city": "Bhopal", "state": "Madhya Pradesh", "lat": 23.2599, "lon": 77.4126, "platforms": 6, "zone": "WCR"},
    {"code": "ET", "name": "Itarsi Jn", "city": "Itarsi", "state": "Madhya Pradesh", "lat": 22.6139, "lon": 77.7634, "platforms": 7, "zone": "WCR"},
    {"code": "NGP", "name": "Nagpur Jn", "city": "Nagpur", "state": "Maharashtra", "lat": 21.1458, "lon": 79.0882, "platforms": 8, "zone": "CR"},
    {"code": "BPQ", "name": "Balharshah Jn", "city": "Ballarpur", "state": "Maharashtra", "lat": 19.8547, "lon": 79.3364, "platforms": 5, "zone": "CR"},
    {"code": "WL", "name": "Warangal", "city": "Warangal", "state": "Telangana", "lat": 17.9689, "lon": 79.5941, "platforms": 4, "zone": "SCR"},
    {"code": "BZA", "name": "Vijayawada Jn", "city": "Vijayawada", "state": "Andhra Pradesh", "lat": 16.5193, "lon": 80.6305, "platforms": 10, "zone": "SCR"},
    {"code": "OGL", "name": "Ongole", "city": "Ongole", "state": "Andhra Pradesh", "lat": 15.5057, "lon": 80.0499, "platforms": 3, "zone": "SCR"},
    {"code": "NLR", "name": "Nellore", "city": "Nellore", "state": "Andhra Pradesh", "lat": 14.4426, "lon": 79.9865, "platforms": 4, "zone": "SCR"},
    {"code": "GDR", "name": "Gudur Jn", "city": "Gudur", "state": "Andhra Pradesh", "lat": 14.1463, "lon": 79.8504, "platforms": 3, "zone": "SCR"},

    # Western Trunk (Mumbai - Delhi)
    {"code": "MMCT", "name": "Mumbai Central", "city": "Mumbai", "state": "Maharashtra", "lat": 18.9696, "lon": 72.8193, "platforms": 9, "zone": "WR"},
    {"code": "BVI", "name": "Borivali", "city": "Mumbai", "state": "Maharashtra", "lat": 19.2288, "lon": 72.8570, "platforms": 8, "zone": "WR"},
    {"code": "VAPI", "name": "Vapi", "city": "Vapi", "state": "Gujarat", "lat": 20.3712, "lon": 72.9042, "platforms": 3, "zone": "WR"},
    {"code": "ST", "name": "Surat", "city": "Surat", "state": "Gujarat", "lat": 21.2049, "lon": 72.8406, "platforms": 4, "zone": "WR"},
    {"code": "BRC", "name": "Vadodara Jn", "city": "Vadodara", "state": "Gujarat", "lat": 22.3107, "lon": 73.1812, "platforms": 7, "zone": "WR"},
    {"code": "RTM", "name": "Ratlam Jn", "city": "Ratlam", "state": "Madhya Pradesh", "lat": 23.3342, "lon": 75.0375, "platforms": 7, "zone": "WR"},
    {"code": "KOTA", "name": "Kota Jn", "city": "Kota", "state": "Rajasthan", "lat": 25.2138, "lon": 75.8648, "platforms": 4, "zone": "WCR"},
    {"code": "SWM", "name": "Sawai Madhopur", "city": "Sawai Madhopur", "state": "Rajasthan", "lat": 25.9928, "lon": 76.3533, "platforms": 4, "zone": "WCR"},
    
    # Eastern Trunk (Howrah - Delhi)
    {"code": "HWH", "name": "Howrah Jn", "city": "Kolkata", "state": "West Bengal", "lat": 22.5839, "lon": 88.3426, "platforms": 23, "zone": "ER"},
    {"code": "BWN", "name": "Barddhaman Jn", "city": "Barddhaman", "state": "West Bengal", "lat": 23.2324, "lon": 87.8615, "platforms": 8, "zone": "ER"},
    {"code": "ASN", "name": "Asansol Jn", "city": "Asansol", "state": "West Bengal", "lat": 23.6871, "lon": 86.9746, "platforms": 7, "zone": "ER"},
    {"code": "DHN", "name": "Dhanbad Jn", "city": "Dhanbad", "state": "Jharkhand", "lat": 23.7915, "lon": 86.4304, "platforms": 8, "zone": "ECR"},
    {"code": "GAYA", "name": "Gaya Jn", "city": "Gaya", "state": "Bihar", "lat": 24.8020, "lon": 84.9994, "platforms": 9, "zone": "ECR"},
    {"code": "DDU", "name": "Pt Deen Dayal Upadhyaya", "city": "Mughalsarai", "state": "Uttar Pradesh", "lat": 25.2818, "lon": 83.1189, "platforms": 8, "zone": "ECR"},
    {"code": "PRYJ", "name": "Prayagraj Jn", "city": "Prayagraj", "state": "Uttar Pradesh", "lat": 25.4497, "lon": 81.8286, "platforms": 10, "zone": "NCR"},
    {"code": "CNB", "name": "Kanpur Central", "city": "Kanpur", "state": "Uttar Pradesh", "lat": 26.4537, "lon": 80.3510, "platforms": 10, "zone": "NCR"}
]

ROUTES_DATA = [
    {
        "id": "R_MAS_CBE",
        "name": "Chennai Central - Coimbatore Main Trunk",
        "stations": ["MAS", "AJJ", "KPD", "AB", "VN", "JTJ", "TPT", "MAP", "SA", "SGE", "ED", "TUP", "CBF", "CBE"],
        "distances": [0, 69, 130, 182, 198, 214, 229, 297, 334, 381, 396, 446, 492, 497]  # km
    },
    {
        "id": "R_MAS_SBC",
        "name": "Chennai Central - KSR Bengaluru",
        "stations": ["MAS", "AJJ", "KPD", "JTJ", "BWT", "KJM", "BNC", "SBC"],
        "distances": [0, 69, 130, 214, 284, 344, 356, 362]
    },
    {
        "id": "R_NDLS_MAS",
        "name": "Grand Trunk North-South Corridor (NDLS - MAS)",
        "stations": ["NDLS", "MTJ", "AGC", "GWL", "VGLJ", "BINA", "BPL", "ET", "NGP", "BPQ", "WL", "BZA", "OGL", "NLR", "GDR", "MAS"],
        "distances": [0, 141, 195, 313, 411, 563, 702, 794, 1092, 1300, 1442, 1749, 1888, 2004, 2042, 2180]
    },
    {
        "id": "R_MMCT_NDLS",
        "name": "Western Rajdhani Route (MMCT - NDLS)",
        "stations": ["MMCT", "BVI", "VAPI", "ST", "BRC", "RTM", "KOTA", "SWM", "MTJ", "NDLS"],
        "distances": [0, 30, 170, 263, 392, 653, 919, 1027, 1243, 1384]
    },
    {
        "id": "R_HWH_NDLS",
        "name": "Eastern Trunk Route (HWH - NDLS)",
        "stations": ["HWH", "BWN", "ASN", "DHN", "GAYA", "DDU", "PRYJ", "CNB", "NDLS"],
        "distances": [0, 95, 200, 259, 458, 663, 816, 1010, 1445]
    }
]

TRAINS_METADATA = [
    {"number": "12627", "name": "Karnataka Express", "type": "Superfast Express", "route_id": "R_NDLS_MAS", "origin": "NDLS", "destination": "SBC", "priority": 1, "max_speed": 110},
    {"number": "12675", "name": "Kovai Superfast Express", "type": "Superfast Express", "route_id": "R_MAS_CBE", "origin": "MAS", "destination": "CBE", "priority": 2, "max_speed": 110},
    {"number": "12007", "name": "Shatabdi Express", "type": "Shatabdi", "route_id": "R_MAS_SBC", "origin": "MAS", "destination": "SBC", "priority": 1, "max_speed": 130},
    {"number": "20607", "name": "Vande Bharat Express", "type": "Vande Bharat", "route_id": "R_MAS_SBC", "origin": "MAS", "destination": "SBC", "priority": 1, "max_speed": 130},
    {"number": "12679", "name": "Coimbatore Intercity", "type": "Intercity", "route_id": "R_MAS_CBE", "origin": "MAS", "destination": "CBE", "priority": 3, "max_speed": 105},
    {"number": "12951", "name": "Mumbai Rajdhani", "type": "Rajdhani Express", "route_id": "R_MMCT_NDLS", "origin": "MMCT", "destination": "NDLS", "priority": 1, "max_speed": 130},
    {"number": "12301", "name": "Howrah Rajdhani", "type": "Rajdhani Express", "route_id": "R_HWH_NDLS", "origin": "HWH", "destination": "NDLS", "priority": 1, "max_speed": 130},
    {"number": "12626", "name": "Kerala Express", "type": "Superfast Express", "route_id": "R_NDLS_MAS", "origin": "NDLS", "destination": "MAS", "priority": 2, "max_speed": 110},
    {"number": "12616", "name": "Grand Trunk Express", "type": "Superfast Express", "route_id": "R_NDLS_MAS", "origin": "NDLS", "destination": "MAS", "priority": 2, "max_speed": 110},
    {"number": "22625", "name": "Chennai - Bangalore Double Decker", "type": "Double Decker", "route_id": "R_MAS_SBC", "origin": "MAS", "destination": "SBC", "priority": 2, "max_speed": 110}
]

# Expand to 100+ trains dynamically
TRAIN_TYPES = ["Vande Bharat", "Rajdhani Express", "Shatabdi", "Superfast Express", "Mail/Express", "Passenger/MEMU"]
PRIORITY_MAP = {"Vande Bharat": 1, "Rajdhani Express": 1, "Shatabdi": 1, "Superfast Express": 2, "Mail/Express": 3, "Passenger/MEMU": 4}
SPEED_LIMIT_MAP = {"Vande Bharat": 130, "Rajdhani Express": 130, "Shatabdi": 130, "Superfast Express": 110, "Mail/Express": 100, "Passenger/MEMU": 80}

def generate_all_trains():
    trains = list(TRAINS_METADATA)
    existing_nums = set(t["number"] for t in trains)
    
    routes = {r["id"]: r for r in ROUTES_DATA}
    route_ids = list(routes.keys())
    
    # Generate up to 105 trains
    series = [12, 16, 20, 22, 11, 14, 18]
    while len(trains) < 105:
        prefix = random.choice(series)
        num = f"{prefix}{random.randint(100, 999)}"
        if num in existing_nums:
            continue
        existing_nums.add(num)
        
        route_id = random.choice(route_ids)
        route = routes[route_id]
        t_type = random.choice(TRAIN_TYPES)
        
        # Name generator
        name_prefixes = ["Coromandel", "Cheran", "Yercaud", "Nilgiri", "Brindavan", "Vaigai", "Pandian", "Kongu", "Mangalore", "Sanghamitra", "Ganga Kaveri", "Deccan", "Paschim", "Purushottam", "Kalka", "Kashi"]
        name_suffixes = ["Express", "Superfast", "Mail", "Link Express", "Special"]
        name = f"{random.choice(name_prefixes)} {random.choice(name_suffixes)}"
        
        trains.append({
            "number": num,
            "name": name,
            "type": t_type,
            "route_id": route_id,
            "origin": route["stations"][0],
            "destination": route["stations"][-1],
            "priority": PRIORITY_MAP[t_type],
            "max_speed": SPEED_LIMIT_MAP[t_type]
        })
    return trains


def generate_sections(routes):
    """Generate discrete track sections between adjacent stations with characteristics."""
    sections = {}
    for r in routes:
        stations = r["stations"]
        distances = r["distances"]
        for i in range(len(stations) - 1):
            s_from = stations[i]
            s_to = stations[i+1]
            sec_id = f"SEC_{s_from}_{s_to}"
            dist = distances[i+1] - distances[i]
            if sec_id not in sections:
                # Section characteristics
                # Grade/terrain difficulty, baseline max speed
                track_quality = round(random.uniform(0.85, 1.0), 2)
                sections[sec_id] = {
                    "id": sec_id,
                    "from_station": s_from,
                    "to_station": s_to,
                    "distance_km": dist,
                    "max_speed_kmh": 110 if dist > 40 else 90,
                    "nominal_minutes": round((dist / 85.0) * 60, 1),
                    "double_track": True,
                    "electrified": True,
                    "congestion_level": "low",  # low, medium, high
                    "has_speed_restriction": False,
                    "speed_restriction_kmh": None,
                    "weather_condition": "clear"  # clear, rain, fog, heavy_rain
                }
    return list(sections.values())


def generate_historical_runs(trains, routes_dict, sections_dict, num_runs_per_train=25):
    """
    Generate rich historical train runs with realistic physics and delay causality:
    - Base sectional running time = dist / speed
    - Dwell times at stations
    - Signal delays, speed restrictions, weather events, time of day congestion
    - Delay recovery on high-speed sections
    """
    records = []
    
    # Pre-index sections
    sec_map = {(s["from_station"], s["to_station"]): s for s in sections_dict}
    
    weather_types = ["clear", "clear", "clear", "clear", "rain", "heavy_rain", "fog"]
    congestion_types = ["low", "low", "medium", "medium", "high"]
    
    for train in trains:
        route = routes_dict.get(train["route_id"])
        if not route:
            continue
            
        stations = route["stations"]
        distances = route["distances"]
        
        for run_idx in range(num_runs_per_train):
            # Run date in recent 60 days
            run_date = datetime(2026, 7, 1) + timedelta(days=random.randint(0, 60), hours=random.randint(4, 22), minutes=random.randint(0, 59))
            day_of_week = run_date.weekday()
            hour_of_day = run_date.hour
            is_peak_hour = hour_of_day in [8, 9, 10, 17, 18, 19, 20]
            
            # Initial departure delay at origin
            # Most trains depart on time or with small delay; 15% depart late
            current_delay = 0
            if random.random() < 0.25:
                current_delay = random.randint(3, 25)
                
            elapsed_time_min = 0
            prev_station_delay = current_delay
            
            for i in range(len(stations) - 1):
                st_from = stations[i]
                st_to = stations[i+1]
                dist = distances[i+1] - distances[i]
                dist_to_dest = distances[-1] - distances[i]
                rem_stops = len(stations) - 1 - i
                
                sec_info = sec_map.get((st_from, st_to))
                nominal_time = sec_info["nominal_minutes"] if sec_info else (dist / 80.0) * 60
                
                # Dynamic factors for this section in this run
                weather = random.choice(weather_types)
                congestion = random.choice(congestion_types) if not is_peak_hour else random.choices(["medium", "high"], weights=[0.4, 0.6])[0]
                has_tsr = random.random() < 0.12  # Temporary Speed Restriction
                tsr_penalty = random.randint(4, 12) if has_tsr else 0
                
                # Signal hold / precedence overtaking
                signal_delay = 0
                if congestion == "high" and train["priority"] > 1:
                    signal_delay = random.randint(5, 18)
                elif congestion == "medium":
                    signal_delay = random.randint(0, 6)
                
                # Weather slowdown
                weather_penalty = 0
                if weather == "heavy_rain":
                    weather_penalty = random.randint(4, 10)
                elif weather == "fog":
                    weather_penalty = random.randint(6, 15)
                    
                # Train speed capability
                target_speed = train["max_speed"]
                if has_tsr:
                    target_speed = min(target_speed, 45)
                elif congestion == "high":
                    target_speed = target_speed * random.uniform(0.6, 0.8)
                elif congestion == "medium":
                    target_speed = target_speed * random.uniform(0.8, 0.95)
                    
                # Scheduled vs actual running time
                # Scheduled time typically has 5-8% slack for recovery
                slack = nominal_time * 0.08
                scheduled_section_time = round(nominal_time + slack, 1)
                
                # Actual sectional time
                actual_running_time = nominal_time * (85.0 / max(target_speed, 25)) + signal_delay + weather_penalty + tsr_penalty
                # Small random operational variance (+- 5%)
                actual_running_time *= random.uniform(0.96, 1.05)
                actual_running_time = round(actual_running_time, 1)
                
                # Section dwell time at arrival station (except terminus)
                dwell_scheduled = 2 if dist > 50 else 1
                if st_to in ["JTJ", "ED", "SA", "KPD", "BPL", "NGP", "BRC", "CNB"]:
                    dwell_scheduled = 5
                
                dwell_actual = dwell_scheduled
                if current_delay > 15:
                    # Rakes try to expedite dwell if delayed
                    dwell_actual = max(1, dwell_scheduled - 1)
                elif random.random() < 0.10:
                    # Unscheduled loading / boarding delay
                    dwell_actual += random.randint(2, 6)
                    
                # Delay delta on this section:
                # delta = (actual_run + actual_dwell) - (sched_run + sched_dwell)
                section_delay_delta = (actual_running_time + dwell_actual) - (scheduled_section_time + dwell_scheduled)
                
                # Delay recovery capability:
                # If train is high priority and on clear section with no TSR, it can recover slack
                if current_delay > 5 and congestion == "low" and not has_tsr and weather == "clear":
                    recovery = min(current_delay, round(slack * random.uniform(0.6, 1.2), 1))
                    section_delay_delta -= recovery
                    
                new_delay = max(0, round(current_delay + section_delay_delta, 1))
                
                # Feature row for ML dataset
                records.append({
                    "run_id": f"RUN_{train['number']}_{run_idx}",
                    "train_id": train["number"],
                    "train_name": train["name"],
                    "train_type": train["type"],
                    "priority": train["priority"],
                    "from_station": st_from,
                    "to_station": st_to,
                    "section_id": f"SEC_{st_from}_{st_to}",
                    "section_distance_km": round(dist, 1),
                    "distance_to_destination_km": round(dist_to_dest, 1),
                    "remaining_stations": rem_stops,
                    "current_delay_min": round(current_delay, 1),
                    "previous_station_delay_min": round(prev_station_delay, 1),
                    "nominal_section_time_min": nominal_time,
                    "scheduled_section_time_min": scheduled_section_time,
                    "scheduled_dwell_min": dwell_scheduled,
                    "actual_dwell_min": dwell_actual,
                    "time_of_day": hour_of_day,
                    "day_of_week": day_of_week,
                    "is_peak_hour": 1 if is_peak_hour else 0,
                    "congestion_level": congestion,
                    "has_tsr": 1 if has_tsr else 0,
                    "weather_condition": weather,
                    "target_speed_kmh": round(target_speed, 1),
                    "signal_delay_min": signal_delay,
                    "actual_section_time_min": actual_running_time,
                    "arrival_delay_at_next_min": new_delay,  # ML target variable
                    "delay_change_min": round(new_delay - current_delay, 1)
                })
                
                prev_station_delay = current_delay
                current_delay = new_delay
                elapsed_time_min += (actual_running_time + dwell_actual)
                
    return records


def export_seed_data(output_dir="data"):
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(os.path.join(output_dir, "raw"), exist_ok=True)
    os.makedirs(os.path.join(output_dir, "processed"), exist_ok=True)
    
    print("Generating Indian Railway Network dataset...")
    trains = generate_all_trains()
    sections = generate_sections(ROUTES_DATA)
    routes_dict = {r["id"]: r for r in ROUTES_DATA}
    
    print(f"Generated {len(STATIONS_DATA)} Stations, {len(routes_dict)} Major Routes, {len(sections)} Sections, {len(trains)} Trains.")
    
    # Generate 12,000+ historical section run records
    print("Simulating historical train runs with realistic physics, TSRs, congestion & weather...")
    runs = generate_historical_runs(trains, routes_dict, sections, num_runs_per_train=20)
    print(f"Generated {len(runs)} historical section-run records.")
    
    # Save JSON files
    with open(os.path.join(output_dir, "raw", "stations.json"), "w") as f:
        json.dump(STATIONS_DATA, f, indent=2)
        
    with open(os.path.join(output_dir, "raw", "routes.json"), "w") as f:
        json.dump(ROUTES_DATA, f, indent=2)
        
    with open(os.path.join(output_dir, "raw", "trains.json"), "w") as f:
        json.dump(trains, f, indent=2)
        
    with open(os.path.join(output_dir, "raw", "sections.json"), "w") as f:
        json.dump(sections, f, indent=2)
        
    with open(os.path.join(output_dir, "processed", "historical_runs.json"), "w") as f:
        json.dump(runs, f, indent=2)
        
    # Also save CSV for ML training
    import csv
    if runs:
        keys = list(runs[0].keys())
        with open(os.path.join(output_dir, "processed", "train_features.csv"), "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            writer.writerows(runs)
            
    print("Data export complete.")
    return {
        "num_stations": len(STATIONS_DATA),
        "num_routes": len(ROUTES_DATA),
        "num_trains": len(trains),
        "num_sections": len(sections),
        "num_runs": len(runs)
    }

if __name__ == "__main__":
    stats = export_seed_data()
    print("Stats:", stats)
