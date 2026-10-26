# API Documentation: Indian Railways Dynamic ETA Forecasting Engine

**Base URL:** `http://localhost:8000/api`  
**WebSocket Endpoint:** `ws://localhost:8000/ws`

---

## Trains Endpoints

### 1. List Trains
- **Endpoint:** `GET /api/trains`
- **Query Params:** `search`, `origin`, `destination`, `limit` (default: 50)
- **Response:**
```json
{
  "count": 105,
  "trains": [
    {
      "number": "12627",
      "name": "Karnataka Express",
      "type": "Superfast Express",
      "current_location": "Near Salem Jn",
      "current_speed_kmh": 74.0,
      "current_delay_min": 18.0,
      "status": "Delayed (+18m)",
      "risk_level": "Moderate"
    }
  ]
}
```

### 2. Dynamic ETA Forecast (Core Differentiator)
- **Endpoint:** `GET /api/trains/{train_id}/eta`
- **Response:**
```json
{
  "train_id": "12627",
  "train_name": "Karnataka Express",
  "current_location": "Near Salem Jn",
  "current_speed_kmh": 74.0,
  "current_delay_minutes": 18,
  "destination": "CBE",
  "predicted_destination_delay_minutes": 31,
  "expected_additional_delay_minutes": 13,
  "predicted_eta": "22:02",
  "confidence": 0.84,
  "confidence_percent": 84,
  "prediction_range": {
    "lower": "21:56",
    "upper": "22:09"
  },
  "recovery_info": {
    "is_recovering": false,
    "recovery_rate_per_section": -2.0,
    "status_text": "Train delay is increasing by approximately 2.0 minutes per section."
  },
  "delay_contributors": [
    { "factor": "Signal congestion", "impact_minutes": 7.0, "category": "Signalling" },
    { "factor": "Downstream traffic", "impact_minutes": 5.0, "category": "Traffic" },
    { "factor": "Temporary speed restriction", "impact_minutes": 4.0, "category": "Track" }
  ],
  "stations": [
    {
      "station_code": "SA",
      "station_name": "Salem Jn",
      "scheduled_eta": "19:30",
      "predicted_eta": "19:42",
      "delay_minutes": 12,
      "confidence_percent": 91,
      "range_lower": "19:37",
      "range_upper": "19:49",
      "engine_source": "ML"
    }
  ],
  "prediction_source": "ML"
}
```

---

## Passenger Utility Endpoints

### 3. Check Connection Risk
- **Endpoint:** `POST /api/connections/check-risk`
- **Request Body:**
```json
{
  "arriving_train_id": "12627",
  "connecting_train_id": "12675",
  "transfer_station_code": "SA",
  "minimum_buffer_minutes": 15
}
```
- **Response:** Status (`Likely` / `Moderate Risk` / `At Risk`), available transfer window, buffer margin, and actionable recommendation.

### 4. "When Should I Leave?" Planner
- **Endpoint:** `POST /api/departure/when-to-leave`
- **Request Body:**
```json
{
  "train_id": "12627",
  "station_code": "SA",
  "travel_time_to_station_min": 30,
  "desired_station_buffer_min": 20
}
```

---

## Simulation & Operations Endpoints

### 5. Inject Disruption Event
- **Endpoint:** `POST /api/simulation/events`
- **Request Body:**
```json
{
  "event_type": "congestion",
  "train_id": "12627",
  "section_id": "SEC_SA_ED",
  "description": "Heavy freight traffic block",
  "impact_minutes": 16.0,
  "severity": "Severe"
}
```
- **Action:** Recalculates sectional travel time, updates downstream station ETAs, broadcasts update via WebSocket (`EVENT_INJECTED`), and records cascading ripple to trailing trains.
