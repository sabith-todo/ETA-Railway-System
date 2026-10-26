"""
Indian Railways Coach Composition & Berth Layout Service.
Generates authentic rake compositions, platform positioning,
and complete compartment/seat layout matrices for all coaching trains.
"""

from typing import Dict, Any, List, Optional
import math
from backend.app.database.db import get_db

def generate_coach_rake(train_number: str, station_code: Optional[str] = None) -> Dict[str, Any]:
    clean_num = "".join(filter(str.isdigit, str(train_number)))
    
    # Query database for train name and type
    train_info = None
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT number, name, type, origin, destination FROM trains WHERE number = ?", (clean_num,))
        row = cursor.fetchone()
        if row:
            train_info = dict(row)

    name = train_info.get("name", f"Express {clean_num}") if train_info else f"Train {clean_num}"
    t_type = (train_info.get("type", "Superfast") if train_info else "Superfast").lower()

    # Determine train classification
    is_vande_bharat = "vande bharat" in name.lower() or clean_num.startswith("206") or "vande" in t_type
    is_tejas_or_shatabdi = "shatabdi" in name.lower() or "tejas" in name.lower()
    is_jan_shatabdi = "jan shatabdi" in name.lower()
    
    coaches: List[Dict[str, Any]] = []

    if is_vande_bharat:
        # Vande Bharat 8/16-Car Trainset
        rake_schema = [
            ("DTC", "Driving Trailer Coach (Front)", "chaircar", 44, "chair_car", "CC"),
            ("C1", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("C2", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("E1", "Executive Class", "executive", 52, "executive", "EC"),
            ("C3", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("C4", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("C5", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("DTC", "Driving Trailer Coach (Rear)", "chaircar", 44, "chair_car", "CC"),
        ]
    elif is_tejas_or_shatabdi:
        # Shatabdi / Tejas Express
        rake_schema = [
            ("LOCO", "Locomotive (WAP-7 Electric)", "loco", 0, "none", "LOC"),
            ("EOG1", "End-on Generation Power Car", "slr", 0, "none", "GEN"),
            ("E1", "Executive Chair Car", "executive", 52, "executive", "EC"),
            ("E2", "Executive Chair Car", "executive", 52, "executive", "EC"),
            ("C1", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("C2", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("C3", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("C4", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("C5", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("C6", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("C7", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("EOG2", "End-on Generation Power Car", "slr", 0, "none", "GEN"),
        ]
    elif is_jan_shatabdi:
        # Jan Shatabdi Express
        rake_schema = [
            ("LOCO", "Locomotive (WAP-7)", "loco", 0, "none", "LOC"),
            ("SLR1", "Seating cum Luggage & Divyangjan", "slr", 30, "chair_car", "2S"),
            ("D1", "Second Sitting (2S)", "general", 108, "chair_car", "2S"),
            ("D2", "Second Sitting (2S)", "general", 108, "chair_car", "2S"),
            ("D3", "Second Sitting (2S)", "general", 108, "chair_car", "2S"),
            ("D4", "Second Sitting (2S)", "general", 108, "chair_car", "2S"),
            ("C1", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("C2", "AC Chair Car", "chaircar", 78, "chair_car", "CC"),
            ("D5", "Second Sitting (2S)", "general", 108, "chair_car", "2S"),
            ("D6", "Second Sitting (2S)", "general", 108, "chair_car", "2S"),
            ("D7", "Second Sitting (2S)", "general", 108, "chair_car", "2S"),
            ("SLR2", "Seating cum Luggage", "slr", 30, "chair_car", "2S"),
        ]
    else:
        # Standard Southern Railway Superfast / Express 22-Coach LHB Rake
        # e.g., Vaigai Express, Pandian Express, Kovai Express, Karnataka Express
        rake_schema = [
            ("LOCO", "Locomotive WAP-7 (Electric 6350 HP)", "loco", 0, "none", "LOC"),
            ("EOG1", "Power Car / Luggage Van", "slr", 0, "none", "GEN"),
            ("GS1", "General Unreserved Second Class", "general", 100, "none", "GEN"),
            ("GS2", "General Unreserved Second Class", "general", 100, "none", "GEN"),
            ("S1", "Sleeper Class", "sleeper", 72, "8_berth_sleeper", "SL"),
            ("S2", "Sleeper Class", "sleeper", 72, "8_berth_sleeper", "SL"),
            ("S3", "Sleeper Class", "sleeper", 72, "8_berth_sleeper", "SL"),
            ("S4", "Sleeper Class", "sleeper", 72, "8_berth_sleeper", "SL"),
            ("S5", "Sleeper Class", "sleeper", 72, "8_berth_sleeper", "SL"),
            ("S6", "Sleeper Class", "sleeper", 72, "8_berth_sleeper", "SL"),
            ("PC", "Pantry Car / Catering Rake", "pantry", 0, "none", "PC"),
            ("B1", "AC 3-Tier (LHB)", "ac3", 72, "8_berth_sleeper", "3A"),
            ("B2", "AC 3-Tier (LHB)", "ac3", 72, "8_berth_sleeper", "3A"),
            ("B3", "AC 3-Tier (LHB)", "ac3", 72, "8_berth_sleeper", "3A"),
            ("B4", "AC 3-Tier (LHB)", "ac3", 72, "8_berth_sleeper", "3A"),
            ("B5", "AC 3-Tier (LHB)", "ac3", 72, "8_berth_sleeper", "3A"),
            ("A1", "AC 2-Tier (LHB)", "ac2", 54, "6_berth_ac2", "2A"),
            ("A2", "AC 2-Tier (LHB)", "ac2", 54, "6_berth_ac2", "2A"),
            ("H1", "AC First Class (1A Coupe/Cabin)", "ac1", 24, "4_berth_ac1", "1A"),
            ("GS3", "General Unreserved Second Class", "general", 100, "none", "GEN"),
            ("GS4", "General Unreserved Second Class", "general", 100, "none", "GEN"),
            ("SLR2", "Seating cum Luggage & Guard Van", "slr", 30, "none", "GEN"),
        ]

    total_len = len(rake_schema)
    coach_len_m = 24.0  # standard LHB coach length in meters

    for idx, (code, cname, category, berths, layout, class_code) in enumerate(rake_schema):
        pos = idx + 1
        dist_from_engine = round(idx * coach_len_m, 1)

        # Platform location relative to length
        rel_pos = pos / total_len
        if rel_pos <= 0.33:
            pf_loc = "Front of Platform"
        elif rel_pos <= 0.66:
            pf_loc = "Middle of Platform"
        else:
            pf_loc = "Rear of Platform"

        # Amenities based on category
        amenities = ["Bio-Toilet", "Emergency Window"]
        if category in ["ac1", "ac2", "ac3", "chaircar", "executive"]:
            amenities.extend(["Air Conditioning", "Charging Socket at every seat", "Reading Lights"])
        if category == "sleeper":
            amenities.extend(["Charging Points in bay", "Ceiling Fans", "Luggage racks"])
        if category == "ac1":
            amenities.extend(["Lockable sliding doors", "Shower Facility", "Personal Bell"])
        if category == "pantry":
            amenities = ["Commercial Kitchen", "Deep Freezers", "Manager Desk", "RO Water Filter"]
        if category == "loco":
            amenities = ["Cab Air Conditioning", "Vigilance Control Device", "Kavach Collision Prevention"]

        coaches.append({
            "position": pos,
            "code": code,
            "name": cname,
            "category": category,
            "class_code": class_code,
            "total_berths": berths,
            "layout_type": layout,
            "distance_from_engine_m": dist_from_engine,
            "platform_section": pf_loc,
            "amenities": amenities,
        })

    platform_str = "1"
    if station_code:
        # Pick realistic platform based on station hash
        platform_str = str((abs(hash(station_code + clean_num)) % 6) + 1)

    return {
        "train_number": clean_num,
        "train_name": name,
        "train_type": train_info.get("type", "Superfast") if train_info else "Superfast",
        "origin": train_info.get("origin", "MAS") if train_info else "MAS",
        "destination": train_info.get("destination", "MDU") if train_info else "MDU",
        "station_code": station_code.upper() if station_code else None,
        "platform": platform_str,
        "total_coaches": len(coaches),
        "total_length_meters": round(len(coaches) * coach_len_m, 1),
        "engine_position": "Front (Loco facing Destination)",
        "rake_type": "LHB Air-Conditioned Rake" if not is_vande_bharat else "Vande Bharat Semi-High Speed Trainset",
        "coaches": coaches
    }

def get_seat_info(coach_code: str, seat_number: int, layout_type: str) -> Dict[str, Any]:
    """
    Computes exact berth type and cabin compartment for any seat number in Indian Railways.
    """
    if seat_number <= 0:
        return {"error": "Invalid seat number"}

    if layout_type == "8_berth_sleeper":
        # 72 or 80 berths. Compartments of 8.
        comp_num = math.ceil(seat_number / 8)
        mod = seat_number % 8
        if mod in (1, 4):
            b_type = "Lower Berth"
            short = "LB"
            loc = "Cabin"
        elif mod in (2, 5):
            b_type = "Middle Berth"
            short = "MB"
            loc = "Cabin"
        elif mod in (3, 6):
            b_type = "Upper Berth"
            short = "UB"
            loc = "Cabin"
        elif mod == 7:
            b_type = "Side Lower Berth"
            short = "SL"
            loc = "Corridor / Window"
        else:  # 0
            b_type = "Side Upper Berth"
            short = "SU"
            loc = "Corridor / Window"

        return {
            "seat_number": seat_number,
            "coach_code": coach_code,
            "berth_type": b_type,
            "berth_short": short,
            "compartment_number": comp_num,
            "compartment_label": f"Bay {comp_num}",
            "location": loc,
            "is_window": mod in (1, 4, 7),
        }

    elif layout_type == "6_berth_ac2":
        # 54 berths. Compartments of 6.
        comp_num = math.ceil(seat_number / 6)
        mod = seat_number % 6
        if mod in (1, 3):
            b_type = "Lower Berth"
            short = "LB"
            loc = "Cabin"
        elif mod in (2, 4):
            b_type = "Upper Berth"
            short = "UB"
            loc = "Cabin"
        elif mod == 5:
            b_type = "Side Lower Berth"
            short = "SL"
            loc = "Corridor / Window"
        else:  # 0
            b_type = "Side Upper Berth"
            short = "SU"
            loc = "Corridor / Window"

        return {
            "seat_number": seat_number,
            "coach_code": coach_code,
            "berth_type": b_type,
            "berth_short": short,
            "compartment_number": comp_num,
            "compartment_label": f"Bay {comp_num}",
            "location": loc,
            "is_window": mod in (1, 3, 5),
        }

    elif layout_type == "4_berth_ac1":
        # AC First Class: Cabins (4) & Coupes (2)
        if seat_number <= 4:
            label = "Cabin A (4 Berths)"
            b_type = "Lower Berth" if seat_number in (1, 3) else "Upper Berth"
        elif seat_number <= 8:
            label = "Cabin B (4 Berths)"
            b_type = "Lower Berth" if seat_number in (5, 7) else "Upper Berth"
        elif seat_number <= 12:
            label = "Cabin C (4 Berths)"
            b_type = "Lower Berth" if seat_number in (9, 11) else "Upper Berth"
        elif seat_number <= 16:
            label = "Cabin D (4 Berths)"
            b_type = "Lower Berth" if seat_number in (13, 15) else "Upper Berth"
        elif seat_number <= 18:
            label = "Coupe E (2 Berths)"
            b_type = "Lower Berth" if seat_number == 17 else "Upper Berth"
        elif seat_number <= 20:
            label = "Coupe F (2 Berths)"
            b_type = "Lower Berth" if seat_number == 19 else "Upper Berth"
        else:
            label = f"Cabin G ({seat_number})"
            b_type = "Lower Berth" if seat_number % 2 == 1 else "Upper Berth"

        return {
            "seat_number": seat_number,
            "coach_code": coach_code,
            "berth_type": b_type,
            "berth_short": "LB" if "Lower" in b_type else "UB",
            "compartment_number": label,
            "compartment_label": label,
            "location": "Private Lockable Enclosure",
            "is_window": True,
        }

    elif layout_type in ("chair_car", "executive"):
        row = math.ceil(seat_number / (5 if layout_type == "chair_car" else 4))
        mod = seat_number % (5 if layout_type == "chair_car" else 4)
        if layout_type == "chair_car":
            # 3 + 2 layout (W, M, A | A, W)
            mapping = {1: ("Window Seat", "W"), 2: ("Middle Seat", "M"), 3: ("Aisle Seat", "A"), 4: ("Aisle Seat", "A"), 0: ("Window Seat", "W")}
            b_type, short = mapping.get(mod, ("Seat", "S"))
        else:
            # 2 + 2 layout (W, A | A, W)
            mapping = {1: ("Window Seat", "W"), 2: ("Aisle Seat", "A"), 3: ("Aisle Seat", "A"), 0: ("Window Seat", "W")}
            b_type, short = mapping.get(mod, ("Seat", "S"))

        return {
            "seat_number": seat_number,
            "coach_code": coach_code,
            "berth_type": b_type,
            "berth_short": short,
            "compartment_number": row,
            "compartment_label": f"Row {row}",
            "location": b_type,
            "is_window": short == "W",
        }

    return {
        "seat_number": seat_number,
        "coach_code": coach_code,
        "berth_type": "Seat",
        "berth_short": "S",
        "compartment_number": math.ceil(seat_number / 8),
        "compartment_label": f"Bay {math.ceil(seat_number / 8)}",
        "location": "Coach Saloon",
        "is_window": False,
    }
