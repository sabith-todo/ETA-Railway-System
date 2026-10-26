"""
Pydantic Schemas for API Requests and Responses.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class StationModel(BaseModel):
    code: str
    name: str
    city: str
    state: str
    lat: float
    lon: float
    platforms: int
    zone: str

class SectionModel(BaseModel):
    id: str
    from_station: str
    to_station: str
    distance_km: float
    max_speed_kmh: float
    nominal_minutes: float
    double_track: bool = True
    electrified: bool = True
    congestion_level: str = "low"
    has_speed_restriction: bool = False
    speed_restriction_kmh: Optional[float] = None
    weather_condition: str = "clear"

class TrainSummary(BaseModel):
    number: str
    name: str
    type: str
    route_id: str
    origin: str
    destination: str
    priority: int
    current_location: str
    current_speed_kmh: float
    current_delay_min: float
    status: str
    risk_level: str
    predicted_destination_delay_min: Optional[float] = None
    predicted_eta: Optional[str] = None
    confidence_percent: Optional[int] = None

class StationETARow(BaseModel):
    station_code: str
    station_name: Optional[str] = None
    scheduled_eta: str
    predicted_eta: str
    delay_minutes: int
    confidence: float
    confidence_percent: int
    range_lower: str
    range_upper: str
    status: str = "Upcoming" # Passed, Current, Upcoming
    platform: Optional[int] = None

class DelayContributor(BaseModel):
    factor: str
    impact_minutes: float
    category: str

class RecoveryInfo(BaseModel):
    is_recovering: bool
    recovery_rate_per_section: float
    status_text: str

class DynamicETAResponse(BaseModel):
    train_id: str
    train_name: str
    current_location: str
    current_speed_kmh: float
    current_delay_minutes: int
    destination: str
    destination_name: Optional[str] = None
    predicted_destination_delay_minutes: int
    expected_additional_delay_minutes: int
    predicted_eta: str
    confidence: float
    confidence_percent: int
    prediction_range: Dict[str, str]
    recovery_info: RecoveryInfo
    delay_contributors: List[DelayContributor]
    total_predicted_impact_minutes: float
    stations: List[StationETARow]
    prediction_source: str
    last_updated: str

class OperationalEventCreate(BaseModel):
    train_id: Optional[str] = None
    section_id: Optional[str] = None
    event_type: str # signal_delay, congestion, speed_restriction, unscheduled_stop, heavy_rain, clear_conditions
    description: str
    impact_minutes: float = 10.0
    severity: str = "Moderate" # Low, Moderate, High, Severe

class OperationalEventResponse(OperationalEventCreate):
    id: str
    created_at: str
    active: bool

class TransferStationInfo(BaseModel):
    station_code: str
    station_name: str
    city: str
    state: Optional[str] = None

class PopularConnectionPair(BaseModel):
    id: str
    title: str
    arriving_train_id: str
    arriving_train_name: str
    connecting_train_id: str
    connecting_train_name: str
    transfer_station_code: str
    transfer_station_name: str
    description: str

class ConnectionCheckRequest(BaseModel):
    arriving_train_id: str
    connecting_train_id: str
    transfer_station_code: str
    minimum_buffer_minutes: int = 15

class ConnectionCheckResponse(BaseModel):
    arriving_train_id: str
    arriving_train_name: str
    predicted_arrival_time: str
    scheduled_arrival_time: Optional[str] = None
    arriving_delay_minutes: int = 0
    arriving_confidence_percent: Optional[int] = None
    connecting_train_id: str
    connecting_train_name: str
    scheduled_departure_time: str
    predicted_departure_time: Optional[str] = None
    connecting_delay_minutes: int = 0
    connecting_confidence_percent: Optional[int] = None
    transfer_station: str
    transfer_station_name: Optional[str] = None
    scheduled_transfer_minutes: Optional[int] = None
    available_transfer_minutes: int
    buffer_margin_minutes: int
    platform_arriving: Optional[int] = None
    platform_connecting: Optional[int] = None
    cross_platform_transfer: Optional[bool] = None
    status: str # "Likely", "Moderate Risk", "At Risk", "Missed"
    recommendation: str

class DeparturePlannerRequest(BaseModel):
    train_id: str
    station_code: str
    travel_time_to_station_min: int = 30
    desired_station_buffer_min: int = 20

class DeparturePlannerResponse(BaseModel):
    train_id: str
    train_name: str
    station_code: str
    station_name: str
    scheduled_departure: str
    predicted_departure: str
    current_delay_minutes: int
    travel_time_min: int
    station_buffer_min: int
    recommended_leave_time: str
    time_saved_due_to_delay_min: int
    advice: str

class DashboardSummary(BaseModel):
    total_active_trains: int
    on_time_trains: int
    delayed_trains: int
    severely_delayed_trains: int
    high_risk_trains: int
    congested_sections: int
    active_speed_restrictions: int
    predicted_network_impact_min: float
