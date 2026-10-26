"""
Script to enrich the Railway ETA database with complete suburban and intermediate sub-railway stations
across Southern Railway and Tamil Nadu corridors.
"""

import json
import os
import sqlite3

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend", "railway_eta.db"))
STATIONS_JSON = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", "raw", "stations.json"))

# Comprehensive catalog of suburban and intermediate railway sub-stations
SUB_STATIONS = [
    # --- Chennai South Suburban Line (Chennai Beach to Chengalpattu) ---
    {"code": "MSF", "name": "Chennai Fort", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0805, "lon": 80.2831, "platforms": 4, "zone": "SR"},
    {"code": "MPK", "name": "Chennai Park", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0789, "lon": 80.2762, "platforms": 4, "zone": "SR"},
    {"code": "MSC", "name": "Chetpet", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0694, "lon": 80.2435, "platforms": 2, "zone": "SR"},
    {"code": "NBK", "name": "Nungambakkam", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0617, "lon": 80.2333, "platforms": 2, "zone": "SR"},
    {"code": "MKK", "name": "Kodambakkam", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0519, "lon": 80.2238, "platforms": 2, "zone": "SR"},
    {"code": "MBM", "name": "Mambalam", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0382, "lon": 80.2241, "platforms": 4, "zone": "SR"},
    {"code": "SP", "name": "Saidapet", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0233, "lon": 80.2185, "platforms": 2, "zone": "SR"},
    {"code": "GDY", "name": "Guindy", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0083, "lon": 80.2133, "platforms": 4, "zone": "SR"},
    {"code": "STM", "name": "St Thomas Mount", "city": "Chennai", "state": "Tamil Nadu", "lat": 12.9961, "lon": 80.1983, "platforms": 4, "zone": "SR"},
    {"code": "PZA", "name": "Pazhavanthangal", "city": "Chennai", "state": "Tamil Nadu", "lat": 12.9868, "lon": 80.1872, "platforms": 2, "zone": "SR"},
    {"code": "MN", "name": "Meenambakkam", "city": "Chennai", "state": "Tamil Nadu", "lat": 12.9786, "lon": 80.1772, "platforms": 2, "zone": "SR"},
    {"code": "TLM", "name": "Tirusulam (Chennai Airport)", "city": "Chennai", "state": "Tamil Nadu", "lat": 12.9691, "lon": 80.1652, "platforms": 2, "zone": "SR"},
    {"code": "PV", "name": "Pallavaram", "city": "Chennai", "state": "Tamil Nadu", "lat": 12.9567, "lon": 80.1478, "platforms": 4, "zone": "SR"},
    {"code": "CMP", "name": "Chromepet", "city": "Chennai", "state": "Tamil Nadu", "lat": 12.9469, "lon": 80.1367, "platforms": 2, "zone": "SR"},
    {"code": "TBMS", "name": "Tambaram Sanatorium", "city": "Chennai", "state": "Tamil Nadu", "lat": 12.9361, "lon": 80.1256, "platforms": 2, "zone": "SR"},
    {"code": "PRGL", "name": "Perungalathur", "city": "Chennai", "state": "Tamil Nadu", "lat": 12.9056, "lon": 80.0989, "platforms": 2, "zone": "SR"},
    {"code": "VDR", "name": "Vandalur", "city": "Chennai", "state": "Tamil Nadu", "lat": 12.8911, "lon": 80.0817, "platforms": 2, "zone": "SR"},
    {"code": "UPM", "name": "Urapakkam", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.8683, "lon": 80.0683, "platforms": 2, "zone": "SR"},
    {"code": "GI", "name": "Guduvancheri", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.8467, "lon": 80.0578, "platforms": 3, "zone": "SR"},
    {"code": "POTI", "name": "Potheri (SRM)", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.8258, "lon": 80.0417, "platforms": 2, "zone": "SR"},
    {"code": "CTM", "name": "Kattangulathur", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.8167, "lon": 80.0333, "platforms": 2, "zone": "SR"},
    {"code": "MMNK", "name": "Maraimalai Nagar", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.8028, "lon": 80.0233, "platforms": 2, "zone": "SR"},
    {"code": "SKL", "name": "Singaperumal Koil", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.7667, "lon": 80.0033, "platforms": 2, "zone": "SR"},
    {"code": "PWU", "name": "Paranur (Mahindra City)", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.7217, "lon": 79.9917, "platforms": 2, "zone": "SR"},

    # --- Chennai West Suburban Line (Chennai Central to Arakkonam) ---
    {"code": "MASS", "name": "Chennai Central Suburban", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lon": 80.2757, "platforms": 6, "zone": "SR"},
    {"code": "BBQ", "name": "Basin Bridge Jn", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.0967, "lon": 80.2717, "platforms": 6, "zone": "SR"},
    {"code": "VPY", "name": "Vyasarpadi Jeeva", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1067, "lon": 80.2617, "platforms": 2, "zone": "SR"},
    {"code": "PER", "name": "Perambur", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1072, "lon": 80.2458, "platforms": 4, "zone": "SR"},
    {"code": "PCW", "name": "Perambur Carriage Works", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1083, "lon": 80.2350, "platforms": 2, "zone": "SR"},
    {"code": "PEW", "name": "Perambur Loco Works", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1092, "lon": 80.2242, "platforms": 2, "zone": "SR"},
    {"code": "VLK", "name": "Villivakkam", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1078, "lon": 80.2078, "platforms": 4, "zone": "SR"},
    {"code": "KOTR", "name": "Korattur", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1111, "lon": 80.1833, "platforms": 2, "zone": "SR"},
    {"code": "PVM", "name": "Pattaravakkam", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1167, "lon": 80.1683, "platforms": 2, "zone": "SR"},
    {"code": "ABU", "name": "Ambattur", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1217, "lon": 80.1517, "platforms": 4, "zone": "SR"},
    {"code": "TMVL", "name": "Thirumullaivoyal", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1267, "lon": 80.1367, "platforms": 2, "zone": "SR"},
    {"code": "ANNR", "name": "Annanur", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1294, "lon": 80.1233, "platforms": 2, "zone": "SR"},
    {"code": "AVD", "name": "Avadi", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1189, "lon": 80.1017, "platforms": 6, "zone": "SR"},
    {"code": "HC", "name": "Hindu College", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.1217, "lon": 80.0817, "platforms": 2, "zone": "SR"},
    {"code": "PAB", "name": "Pattabiram", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.1233, "lon": 80.0633, "platforms": 4, "zone": "SR"},
    {"code": "NEC", "name": "Nemilichery", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.1242, "lon": 80.0417, "platforms": 2, "zone": "SR"},
    {"code": "TI", "name": "Tiruninravur", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.1217, "lon": 80.0217, "platforms": 4, "zone": "SR"},
    {"code": "VEU", "name": "Veppampattu", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.1267, "lon": 79.9867, "platforms": 2, "zone": "SR"},
    {"code": "SVR", "name": "Sevvapet Road", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.1317, "lon": 79.9533, "platforms": 2, "zone": "SR"},
    {"code": "PTLR", "name": "Putlur", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.1367, "lon": 79.9283, "platforms": 2, "zone": "SR"},
    {"code": "EGT", "name": "Egattur", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.1283, "lon": 79.8667, "platforms": 2, "zone": "SR"},
    {"code": "KBT", "name": "Kadambattur", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.1167, "lon": 79.8417, "platforms": 4, "zone": "SR"},
    {"code": "SPAM", "name": "Senji Panambakkam", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.1067, "lon": 79.8083, "platforms": 2, "zone": "SR"},
    {"code": "MAF", "name": "Manavur", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.0967, "lon": 79.7717, "platforms": 2, "zone": "SR"},
    {"code": "TO", "name": "Thiruvalangadu", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.0867, "lon": 79.7333, "platforms": 3, "zone": "SR"},
    {"code": "MSU", "name": "Mosur", "city": "Ranipet", "state": "Tamil Nadu", "lat": 13.0817, "lon": 79.6917, "platforms": 2, "zone": "SR"},
    {"code": "PLMG", "name": "Puliyamangalam", "city": "Ranipet", "state": "Tamil Nadu", "lat": 13.0783, "lon": 79.6783, "platforms": 2, "zone": "SR"},

    # --- Chennai North Suburban Line (to Gummidipoondi) ---
    {"code": "KOK", "name": "Korukkupet", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1117, "lon": 80.2817, "platforms": 2, "zone": "SR"},
    {"code": "TNP", "name": "Tondiarpet", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1250, "lon": 80.2867, "platforms": 2, "zone": "SR"},
    {"code": "TVT", "name": "Tiruvottiyur", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1617, "lon": 80.3017, "platforms": 4, "zone": "SR"},
    {"code": "WCN", "name": "Wimco Nagar", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.1817, "lon": 80.3100, "platforms": 2, "zone": "SR"},
    {"code": "KAVM", "name": "Kathivakkam", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.2017, "lon": 80.3183, "platforms": 2, "zone": "SR"},
    {"code": "ENR", "name": "Ennore", "city": "Chennai", "state": "Tamil Nadu", "lat": 13.2183, "lon": 80.3250, "platforms": 3, "zone": "SR"},
    {"code": "AIP", "name": "Attipattu", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.2517, "lon": 80.3083, "platforms": 2, "zone": "SR"},
    {"code": "AIPP", "name": "Attipattu Pudunagar", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.2683, "lon": 80.2983, "platforms": 2, "zone": "SR"},
    {"code": "NPKM", "name": "Nandiambakkam", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.2833, "lon": 80.2850, "platforms": 2, "zone": "SR"},
    {"code": "MJR", "name": "Minjur", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.3017, "lon": 80.2617, "platforms": 3, "zone": "SR"},
    {"code": "APB", "name": "Anuppampattu", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.3367, "lon": 80.2317, "platforms": 2, "zone": "SR"},
    {"code": "PON", "name": "Ponneri", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.3517, "lon": 80.2017, "platforms": 3, "zone": "SR"},
    {"code": "KVP", "name": "Kavaraippettai", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.3850, "lon": 80.1717, "platforms": 2, "zone": "SR"},
    {"code": "GPD", "name": "Gummidipoondi", "city": "Tiruvallur", "state": "Tamil Nadu", "lat": 13.4117, "lon": 80.1317, "platforms": 5, "zone": "SR"},

    # --- Chengalpattu to Villupuram Sub-stations ---
    {"code": "OV", "name": "Ottivakkam", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.6367, "lon": 79.9483, "platforms": 2, "zone": "SR"},
    {"code": "PALR", "name": "Padalam", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.5917, "lon": 79.9183, "platforms": 2, "zone": "SR"},
    {"code": "KGZ", "name": "Karunguzhi", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.5483, "lon": 79.8883, "platforms": 2, "zone": "SR"},
    {"code": "MMK", "name": "Madurantakam", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.5083, "lon": 79.8833, "platforms": 2, "zone": "SR"},
    {"code": "ACK", "name": "Acharapakkam", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.4117, "lon": 79.8083, "platforms": 2, "zone": "SR"},
    {"code": "TZD", "name": "Tozhuppedu", "city": "Chengalpattu", "state": "Tamil Nadu", "lat": 12.3367, "lon": 79.7683, "platforms": 2, "zone": "SR"},
    {"code": "OLA", "name": "Olakur", "city": "Villupuram", "state": "Tamil Nadu", "lat": 12.2783, "lon": 79.7283, "platforms": 2, "zone": "SR"},
    {"code": "PCLM", "name": "Panchalam", "city": "Villupuram", "state": "Tamil Nadu", "lat": 12.2383, "lon": 79.6883, "platforms": 2, "zone": "SR"},
    {"code": "MYP", "name": "Mailam", "city": "Villupuram", "state": "Tamil Nadu", "lat": 12.1283, "lon": 79.6183, "platforms": 2, "zone": "SR"},
    {"code": "PEI", "name": "Perani", "city": "Villupuram", "state": "Tamil Nadu", "lat": 12.0683, "lon": 79.5783, "platforms": 2, "zone": "SR"},
    {"code": "VVN", "name": "Vikravandi", "city": "Villupuram", "state": "Tamil Nadu", "lat": 12.0283, "lon": 79.5483, "platforms": 2, "zone": "SR"},
    {"code": "MYX", "name": "Mundiyampakkam", "city": "Villupuram", "state": "Tamil Nadu", "lat": 11.9883, "lon": 79.5183, "platforms": 2, "zone": "SR"},

    # --- Villupuram to Trichy Chord Line Sub-stations ---
    {"code": "PRKL", "name": "Parikkal", "city": "Villupuram", "state": "Tamil Nadu", "lat": 11.7683, "lon": 79.3683, "platforms": 2, "zone": "SR"},
    {"code": "ULU", "name": "Ulundurpet", "city": "Kallakurichi", "state": "Tamil Nadu", "lat": 11.6883, "lon": 79.2883, "platforms": 2, "zone": "SR"},
    {"code": "PNDM", "name": "Pennadam", "city": "Cuddalore", "state": "Tamil Nadu", "lat": 11.3917, "lon": 79.2317, "platforms": 2, "zone": "SR"},
    {"code": "MTUR", "name": "Mathur", "city": "Perambalur", "state": "Tamil Nadu", "lat": 11.2883, "lon": 79.1683, "platforms": 2, "zone": "SR"},
    {"code": "SNDI", "name": "Sendurai", "city": "Ariyalur", "state": "Tamil Nadu", "lat": 11.2383, "lon": 79.1383, "platforms": 2, "zone": "SR"},
    {"code": "KKPM", "name": "Kallakkudi Palanganatham", "city": "Tiruchirappalli", "state": "Tamil Nadu", "lat": 10.9883, "lon": 78.9483, "platforms": 2, "zone": "SR"},
    {"code": "PMB", "name": "Pullambadi", "city": "Tiruchirappalli", "state": "Tamil Nadu", "lat": 10.9283, "lon": 78.8983, "platforms": 2, "zone": "SR"},
    {"code": "TPTN", "name": "Tiruchirappalli Town", "city": "Tiruchirappalli", "state": "Tamil Nadu", "lat": 10.8417, "lon": 78.6917, "platforms": 2, "zone": "SR"},
    {"code": "GOC", "name": "Ponmalai (Golden Rock)", "city": "Tiruchirappalli", "state": "Tamil Nadu", "lat": 10.7967, "lon": 78.7183, "platforms": 3, "zone": "SR"},

    # --- Trichy to Madurai Sub-stations ---
    {"code": "PUG", "name": "Punggudi", "city": "Tiruchirappalli", "state": "Tamil Nadu", "lat": 10.7283, "lon": 78.6183, "platforms": 2, "zone": "SR"},
    {"code": "VPJ", "name": "Vaiyampatti", "city": "Tiruchirappalli", "state": "Tamil Nadu", "lat": 10.5383, "lon": 78.3183, "platforms": 2, "zone": "SR"},
    {"code": "AYR", "name": "Ayyalur", "city": "Dindigul", "state": "Tamil Nadu", "lat": 10.4583, "lon": 78.1983, "platforms": 2, "zone": "SR"},
    {"code": "VDM", "name": "Vadamadurai", "city": "Dindigul", "state": "Tamil Nadu", "lat": 10.4283, "lon": 78.1383, "platforms": 2, "zone": "SR"},
    {"code": "KQN", "name": "Kodaikanal Road", "city": "Dindigul", "state": "Tamil Nadu", "lat": 10.1783, "lon": 77.9183, "platforms": 3, "zone": "SR"},
    {"code": "VDP", "name": "Vadipatti", "city": "Madurai", "state": "Tamil Nadu", "lat": 10.0983, "lon": 77.9483, "platforms": 2, "zone": "SR"},
    {"code": "KON", "name": "Kudalnagar", "city": "Madurai", "state": "Tamil Nadu", "lat": 9.9383, "lon": 78.1083, "platforms": 2, "zone": "SR"},

    # --- Arakkonam to Katpadi to Salem to Coimbatore Sub-stations ---
    {"code": "SHU", "name": "Sholinghur", "city": "Ranipet", "state": "Tamil Nadu", "lat": 13.0617, "lon": 79.5283, "platforms": 2, "zone": "SR"},
    {"code": "WJR", "name": "Walajah Road Jn", "city": "Ranipet", "state": "Tamil Nadu", "lat": 12.9817, "lon": 79.3683, "platforms": 3, "zone": "SR"},
    {"code": "MCN", "name": "Mukundarayapuram", "city": "Ranipet", "state": "Tamil Nadu", "lat": 12.9683, "lon": 79.2883, "platforms": 2, "zone": "SR"},
    {"code": "GYM", "name": "Gudiyattam", "city": "Vellore", "state": "Tamil Nadu", "lat": 12.9483, "lon": 78.8683, "platforms": 3, "zone": "SR"},
    {"code": "DC", "name": "Magudanchavadi", "city": "Salem", "state": "Tamil Nadu", "lat": 11.5583, "lon": 77.9883, "platforms": 2, "zone": "SR"},
    {"code": "CV", "name": "Cauvery", "city": "Erode", "state": "Tamil Nadu", "lat": 11.3683, "lon": 77.7483, "platforms": 2, "zone": "SR"},
    {"code": "PY", "name": "Perundurai", "city": "Erode", "state": "Tamil Nadu", "lat": 11.2783, "lon": 77.5883, "platforms": 2, "zone": "SR"},
    {"code": "VZ", "name": "Vijayamangalam", "city": "Tiruppur", "state": "Tamil Nadu", "lat": 11.2383, "lon": 77.5083, "platforms": 2, "zone": "SR"},
    {"code": "UKL", "name": "Uttukuli", "city": "Tiruppur", "state": "Tamil Nadu", "lat": 11.1883, "lon": 77.4483, "platforms": 2, "zone": "SR"},
    {"code": "SNO", "name": "Somanur", "city": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0883, "lon": 77.2183, "platforms": 2, "zone": "SR"},
    {"code": "SUU", "name": "Sulur Road", "city": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0383, "lon": 77.1283, "platforms": 2, "zone": "SR"},
    {"code": "IGU", "name": "Irugur Jn", "city": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0183, "lon": 77.0683, "platforms": 2, "zone": "SR"},
    {"code": "PLMD", "name": "Pilamedu", "city": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0183, "lon": 77.0183, "platforms": 2, "zone": "SR"},

    # --- Madurai to Tirunelveli to Kanyakumari Sub-stations ---
    {"code": "KGD", "name": "Kalligudi", "city": "Virudhunagar", "state": "Tamil Nadu", "lat": 9.7183, "lon": 77.9383, "platforms": 2, "zone": "SR"},
    {"code": "TY", "name": "Tulukapati", "city": "Virudhunagar", "state": "Tamil Nadu", "lat": 9.4883, "lon": 77.9283, "platforms": 2, "zone": "SR"},
    {"code": "KDU", "name": "Kadambur", "city": "Thoothukudi", "state": "Tamil Nadu", "lat": 8.9883, "lon": 77.8683, "platforms": 2, "zone": "SR"},
    {"code": "GDN", "name": "Gangaikondan", "city": "Tirunelveli", "state": "Tamil Nadu", "lat": 8.8383, "lon": 77.7883, "platforms": 2, "zone": "SR"},
    {"code": "SGLM", "name": "Sengulam", "city": "Tirunelveli", "state": "Tamil Nadu", "lat": 8.5883, "lon": 77.6383, "platforms": 2, "zone": "SR"},
    {"code": "NNN", "name": "Nanguneri", "city": "Tirunelveli", "state": "Tamil Nadu", "lat": 8.4883, "lon": 77.5883, "platforms": 2, "zone": "SR"},
    {"code": "AAY", "name": "Aralvaymoli", "city": "Kanyakumari", "state": "Tamil Nadu", "lat": 8.2583, "lon": 77.5283, "platforms": 2, "zone": "SR"}
]

def main():
    print(f"Adding {len(SUB_STATIONS)} sub railway stations to database and JSON catalog...")
    
    # 1. Update SQLite
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    added_count = 0
    for s in SUB_STATIONS:
        cursor.execute("""
        INSERT OR REPLACE INTO stations (code, name, city, state, lat, lon, platforms, zone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (s["code"], s["name"], s["city"], s["state"], s["lat"], s["lon"], s["platforms"], s["zone"]))
        added_count += 1
        
    conn.commit()
    print(f"Successfully inserted/updated {added_count} sub-stations into SQLite.")
    
    # 2. Update stations.json
    existing = []
    if os.path.exists(STATIONS_JSON):
        with open(STATIONS_JSON, "r", encoding="utf-8") as f:
            existing = json.load(f)
            
    existing_codes = {s["code"] for s in existing}
    new_entries = [s for s in SUB_STATIONS if s["code"] not in existing_codes]
    updated_all = existing + new_entries
    
    with open(STATIONS_JSON, "w", encoding="utf-8") as f:
        json.dump(updated_all, f, indent=2)
        
    print(f"Updated {STATIONS_JSON}: Total stations count is now {len(updated_all)}.")
    
    # Check total stations in DB
    cursor.execute("SELECT count(*) FROM stations")
    total_db = cursor.fetchone()[0]
    print(f"Total stations in SQLite: {total_db}")
    conn.close()

if __name__ == "__main__":
    main()
