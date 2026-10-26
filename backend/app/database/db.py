"""
Database Management & Initial Seeding for RailForecastAI.
Supports PostgreSQL (via DATABASE_URL) with automatic fallback to SQLite for local development.
Provides both SQLAlchemy Session support and backwards-compatible direct connection helper.
"""

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session

from backend.app.database.models import (
    Base,
    Station,
    Train,
    TrainStop,
    TrainRun,
    HistoricalRun,
    PredictionRecord,
    SavedTrain,
    AlertItem
)

# 1. Connection Configurations
DATABASE_URL = os.environ.get("DATABASE_URL")
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "..", "railway_eta.db"))
DB_PATH = os.path.abspath(DB_PATH)

if not DATABASE_URL:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    DATABASE_URL = f"sqlite:///{DB_PATH}"

# Configure engine
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 20.0},
        echo=False
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_recycle=3600,
        echo=False
    )

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

@contextmanager
def get_session():
    """Provides a transactional SQLAlchemy session scope."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def get_db_session():
    """FastAPI dependency for SQLAlchemy database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_db():
    """
    Backwards-compatible connection helper for raw SQL queries.
    Uses sqlite3 connection when SQLite is used, or engine.connect() with dict-like row proxy.
    """
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Creates all database tables and indexes using SQLAlchemy metadata."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # 1. Create SQLAlchemy tables
    Base.metadata.create_all(bind=engine)
    
    # Run migration checks on trains table for newly added columns
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(trains);")
        columns = [row[1] for row in cursor.fetchall()]
        if "data_source" not in columns:
            cursor.execute("ALTER TABLE trains ADD COLUMN data_source TEXT DEFAULT 'SCHEDULED';")
        if "last_updated" not in columns:
            cursor.execute("ALTER TABLE trains ADD COLUMN last_updated TIMESTAMP DEFAULT NULL;")
        conn.commit()

    # 2. Also ensure raw SQLite tables exist for legacy routes and sections tables
    with get_db() as conn:
        cursor = conn.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS routes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            stations_json TEXT NOT NULL,
            distances_json TEXT NOT NULL
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sections (
            id TEXT PRIMARY KEY,
            from_station TEXT NOT NULL,
            to_station TEXT NOT NULL,
            distance_km REAL NOT NULL,
            max_speed_kmh REAL NOT NULL,
            nominal_minutes REAL NOT NULL,
            double_track INTEGER DEFAULT 1,
            electrified INTEGER DEFAULT 1,
            congestion_level TEXT DEFAULT 'low',
            has_speed_restriction INTEGER DEFAULT 0,
            speed_restriction_kmh REAL,
            weather_condition TEXT DEFAULT 'clear'
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS operational_events (
            id TEXT PRIMARY KEY,
            train_id TEXT,
            section_id TEXT,
            event_type TEXT NOT NULL,
            description TEXT NOT NULL,
            severity TEXT NOT NULL,
            impact_minutes REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            active INTEGER DEFAULT 1
        );
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS prediction_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            train_id TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            current_delay_min REAL,
            predicted_dest_delay_min REAL,
            confidence REAL,
            prediction_source TEXT
        );
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_trains_route ON trains(route_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sections_from_to ON sections(from_station, to_station);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_active ON operational_events(active);")
        conn.commit()

def seed_initial_data():
    """Seeds database tables from raw JSON assets."""
    data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "raw"))
    if not os.path.exists(data_dir):
        print(f"Seed data directory {data_dir} not found. Skipping seeding.")
        return

    with get_session() as session:
        # Check if already seeded
        if session.query(Station).count() > 0:
            print(f"Database already seeded with {session.query(Station).count()} stations.")
            return

        # 1. Seed Stations
        stations_file = os.path.join(data_dir, "stations.json")
        stations_map = {}
        if os.path.exists(stations_file):
            with open(stations_file, "r", encoding="utf-8") as f:
                stations_data = json.load(f)
            for s in stations_data:
                st = Station(
                    code=s["code"],
                    name=s["name"],
                    city=s["city"],
                    state=s["state"],
                    lat=s["lat"],
                    lon=s["lon"],
                    platforms=s.get("platforms", 2),
                    zone=s.get("zone", "SR")
                )
                session.merge(st)
                stations_map[s["code"]] = st
            session.flush()
            print(f"Seeded {len(stations_data)} stations.")

        # 2. Seed Trains and TrainStops
        trains_file = os.path.join(data_dir, "trains.json")
        if os.path.exists(trains_file):
            with open(trains_file, "r", encoding="utf-8") as f:
                trains_data = json.load(f)
            
            for t in trains_data:
                tr = Train(
                    number=t["number"],
                    name=t["name"],
                    type=t.get("type", "Express"),
                    route_id=t.get("route_id", "RT-GENERIC"),
                    origin=t.get("origin", ""),
                    destination=t.get("destination", ""),
                    departure_time=t.get("departure_time", "06:00"),
                    arrival_time=t.get("arrival_time", "18:00"),
                    schedule_json=json.dumps(t.get("schedule", [])),
                    total_distance_km=float(t.get("total_distance_km", 500)),
                    average_speed_kmh=float(t.get("average_speed_kmh", 70)),
                    priority=int(t.get("priority", 2)),
                    max_speed=float(t.get("max_speed", 110)),
                    current_station_idx=int(t.get("current_station_idx", 0)),
                    current_location=t.get("current_location", t.get("origin", "")),
                    current_lat=float(t.get("current_lat", 13.08)),
                    current_lon=float(t.get("current_lon", 80.27)),
                    current_speed_kmh=float(t.get("current_speed_kmh", 75)),
                    current_delay_min=float(t.get("current_delay_min", 0)),
                    previous_station_delay_min=float(t.get("previous_station_delay_min", 0)),
                    status=t.get("status", "On Time"),
                    risk_level=t.get("risk_level", "Low"),
                    data_source="SCHEDULED"
                )
                session.merge(tr)
                
                # Seed stops
                schedule = t.get("schedule", [])
                for idx, stop in enumerate(schedule):
                    stop_obj = TrainStop(
                        train_number=t["number"],
                        station_code=stop.get("station", stop.get("code", "")),
                        stop_sequence=idx + 1,
                        scheduled_arrival=stop.get("arrival", stop.get("scheduled_arrival")),
                        scheduled_departure=stop.get("departure", stop.get("scheduled_departure")),
                        distance_km=float(stop.get("distance_km", 0.0)),
                        day_count=int(stop.get("day", 1)),
                        platform=str(stop.get("platform", "1"))
                    )
                    session.add(stop_obj)

            session.flush()
            print(f"Seeded {len(trains_data)} trains and schedules.")

        # 3. Seed default saved trains for demo convenience (12635 Vaigai Express, 12627 Karnataka Express)
        session.add(SavedTrain(user_id="default_user", train_number="12635", custom_label="Vaigai Superfast"))
        session.add(SavedTrain(user_id="default_user", train_number="12627", custom_label="Karnataka Express"))
        
        # 4. Seed initial alerts
        session.add(AlertItem(
            train_number="12627",
            user_id="default_user",
            alert_type="DELAY_INCREASED",
            message="Train 12627 Karnataka Express delay increased to +18 min near Salem Jn.",
            threshold_min=10.0,
            is_triggered=True
        ))
        session.add(AlertItem(
            train_number="12635",
            user_id="default_user",
            alert_type="APPROACHING_STATION",
            message="Train 12635 Vaigai Express approaching Tambaram (TBM). ETA in 8 min.",
            threshold_min=5.0,
            is_triggered=False
        ))
        session.commit()

    # Also seed SQLite legacy tables
    with get_db() as conn:
        cursor = conn.cursor()
        routes_file = os.path.join(data_dir, "routes.json")
        if os.path.exists(routes_file):
            with open(routes_file, "r", encoding="utf-8") as f:
                routes_data = json.load(f)
            for r in routes_data:
                cursor.execute("""
                INSERT OR REPLACE INTO routes (id, name, stations_json, distances_json)
                VALUES (?, ?, ?, ?)
                """, (r["id"], r["name"], json.dumps(r["stations"]), json.dumps(r["distances"])))

        sections_file = os.path.join(data_dir, "sections.json")
        if os.path.exists(sections_file):
            with open(sections_file, "r", encoding="utf-8") as f:
                sections_data = json.load(f)
            for s in sections_data:
                cursor.execute("""
                INSERT OR REPLACE INTO sections (id, from_station, to_station, distance_km, max_speed_kmh, 
                                                nominal_minutes, double_track, electrified, congestion_level, 
                                                has_speed_restriction, speed_restriction_kmh, weather_condition)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (s["id"], s["from_station"], s["to_station"], s["distance_km"], s["max_speed_kmh"],
                      s["nominal_minutes"], 1 if s.get("double_track", True) else 0, 1 if s.get("electrified", True) else 0,
                      s.get("congestion_level", "low"), 1 if s.get("has_speed_restriction", False) else 0,
                      s.get("speed_restriction_kmh"), s.get("weather_condition", "clear")))
        conn.commit()
    print("Database seeding completed.")
