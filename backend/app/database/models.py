"""
SQLAlchemy ORM Models for RailForecastAI.
Supports PostgreSQL and SQLite database backends.
"""

from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    Boolean,
    Text,
    ForeignKey,
    Index
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Station(Base):
    """Railway station with geographic coordinates and metadata."""
    __tablename__ = "stations"

    code = Column(String(10), primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    platforms = Column(Integer, default=2)
    zone = Column(String(20), nullable=False)

    # Relationships
    stops = relationship("TrainStop", back_populates="station", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "code": self.code,
            "name": self.name,
            "city": self.city,
            "state": self.state,
            "lat": self.lat,
            "lon": self.lon,
            "platforms": self.platforms,
            "zone": self.zone
        }


class Train(Base):
    """Coaching train master information and current operational state."""
    __tablename__ = "trains"

    number = Column(String(20), primary_key=True, index=True)
    name = Column(String(150), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    route_id = Column(String(50), nullable=False, index=True)
    origin = Column(String(10), nullable=False)
    destination = Column(String(10), nullable=False)
    departure_time = Column(String(10), nullable=True)
    arrival_time = Column(String(10), nullable=True)
    schedule_json = Column(Text, nullable=True)
    total_distance_km = Column(Float, default=0.0)
    average_speed_kmh = Column(Float, default=70.0)
    priority = Column(Integer, default=2)
    max_speed = Column(Float, default=110.0)

    # Operational state
    current_station_idx = Column(Integer, default=0)
    current_location = Column(String(100), default="")
    current_lat = Column(Float, nullable=True)
    current_lon = Column(Float, nullable=True)
    current_speed_kmh = Column(Float, default=0.0)
    current_delay_min = Column(Float, default=0.0)
    previous_station_delay_min = Column(Float, default=0.0)
    status = Column(String(50), default="NOT STARTED")
    risk_level = Column(String(20), default="LOW")
    data_source = Column(String(20), default="SCHEDULED")  # LIVE, LAST KNOWN, SCHEDULED
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    stops = relationship("TrainStop", back_populates="train", cascade="all, delete-orphan")
    runs = relationship("TrainRun", back_populates="train", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "number": self.number,
            "name": self.name,
            "type": self.type,
            "route_id": self.route_id,
            "origin": self.origin,
            "destination": self.destination,
            "departure_time": self.departure_time,
            "arrival_time": self.arrival_time,
            "total_distance_km": self.total_distance_km,
            "average_speed_kmh": self.average_speed_kmh,
            "current_station_idx": self.current_station_idx,
            "current_location": self.current_location,
            "current_lat": self.current_lat,
            "current_lon": self.current_lon,
            "current_speed_kmh": self.current_speed_kmh,
            "current_delay_min": self.current_delay_min,
            "previous_station_delay_min": self.previous_station_delay_min,
            "status": self.status,
            "risk_level": self.risk_level,
            "data_source": self.data_source,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None
        }


class TrainStop(Base):
    """Individual timetable stop sequence for a train."""
    __tablename__ = "train_stops"

    id = Column(Integer, primary_key=True, autoincrement=True)
    train_number = Column(String(20), ForeignKey("trains.number"), nullable=False, index=True)
    station_code = Column(String(10), ForeignKey("stations.code"), nullable=False, index=True)
    stop_sequence = Column(Integer, nullable=False)
    scheduled_arrival = Column(String(10), nullable=True)
    scheduled_departure = Column(String(10), nullable=True)
    distance_km = Column(Float, default=0.0)
    day_count = Column(Integer, default=1)
    platform = Column(String(10), default="1")

    # Relationships
    train = relationship("Train", back_populates="stops")
    station = relationship("Station", back_populates="stops")

    __table_args__ = (
        Index("idx_train_stops_train_seq", "train_number", "stop_sequence"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "train_number": self.train_number,
            "station_code": self.station_code,
            "stop_sequence": self.stop_sequence,
            "scheduled_arrival": self.scheduled_arrival,
            "scheduled_departure": self.scheduled_departure,
            "distance_km": self.distance_km,
            "day_count": self.day_count,
            "platform": self.platform
        }


class TrainRun(Base):
    """Real-time train run session for a particular service date."""
    __tablename__ = "train_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    train_number = Column(String(20), ForeignKey("trains.number"), nullable=False, index=True)
    service_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    current_station = Column(String(10), nullable=True)
    current_delay = Column(Float, default=0.0)
    status = Column(String(50), default="RUNNING")
    last_telemetry_time = Column(DateTime, default=datetime.utcnow)

    # Relationships
    train = relationship("Train", back_populates="runs")

    __table_args__ = (
        Index("idx_train_runs_lookup", "train_number", "service_date"),
    )


class HistoricalRun(Base):
    """Historical sectional movement logs for ML training."""
    __tablename__ = "historical_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    train_number = Column(String(20), nullable=False, index=True)
    section_id = Column(String(50), nullable=False, index=True)
    service_date = Column(String(10), nullable=False, index=True)
    departure_delay = Column(Float, default=0.0)
    arrival_delay = Column(Float, default=0.0)
    speed_kmh = Column(Float, default=65.0)
    weather = Column(String(50), default="clear")
    day_of_week = Column(Integer, default=0)

    __table_args__ = (
        Index("idx_hist_train_date", "train_number", "service_date"),
    )


class PredictionRecord(Base):
    """Logged AI predictions with evaluation timestamps and model version."""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    train_number = Column(String(20), nullable=False, index=True)
    station_code = Column(String(10), nullable=False, index=True)
    scheduled_arrival = Column(String(10), nullable=True)
    predicted_arrival = Column(String(10), nullable=False)
    predicted_delay_min = Column(Float, nullable=False)
    confidence = Column(Float, default=0.85)
    risk_level = Column(String(20), default="LOW")
    model_version = Column(String(50), default="1.0.0")
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_predictions_train_station", "train_number", "station_code"),
    )


class SavedTrain(Base):
    """User-saved favourite trains for quick access."""
    __tablename__ = "saved_trains"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), default="default_user", index=True)
    train_number = Column(String(20), nullable=False, index=True)
    custom_label = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_saved_user_train", "user_id", "train_number", unique=True),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "train_number": self.train_number,
            "custom_label": self.custom_label,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


class AlertItem(Base):
    """User notifications and system alerts."""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    train_number = Column(String(20), nullable=False, index=True)
    user_id = Column(String(50), default="default_user", index=True)
    alert_type = Column(String(50), nullable=False)  # DELAY_INCREASED, ETA_CHANGED, APPROACHING_STATION, STATUS_CHANGED
    message = Column(Text, nullable=False)
    threshold_min = Column(Float, default=10.0)
    is_triggered = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_alerts_user_train", "user_id", "train_number"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "train_number": self.train_number,
            "user_id": self.user_id,
            "alert_type": self.alert_type,
            "message": self.message,
            "threshold_min": self.threshold_min,
            "is_triggered": self.is_triggered,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
