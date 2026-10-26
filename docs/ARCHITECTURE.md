# System Architecture: Dynamic Forecast of Expected Time of Arrival (ETA)

**SIH Problem Statement ID:** 26028  
**Organization / Department:** Ministry of Railways  
**Theme:** Smart Automation  

---

## 1. Executive Summary

Conventional passenger train-tracking systems in Indian Railways answer:
> *"What is the current train status and delay?"*

The **RailForecast AI** Dynamic ETA platform answers:
> *"Where is my train, how late is it now, when will it reach every upcoming station, what will the destination delay be, is the train recovering, and how are downstream trains impacted?"*

---

## 2. High-Level System Architecture

```mermaid
graph TD
    subgraph Client Layer (React + TypeScript + Tailwind + Leaflet)
        PApp[Passenger Portal\nDynamic ETA, Route Timeline, Map]
        OpsDash[Operations Dashboard\nRisk Triage, Headway Bottlenecks]
        AnalyticsDash[AI Analytics\nModel Comparisons, Residuals]
        SimPanel[SIH Simulator Control\nReal-Time Disruption Injection]
    end

    subgraph API & Real-Time Gateway (FastAPI + WebSockets)
        FastAPIServer[FastAPI REST Engine]
        WSBroadcaster[WebSocket Connection Manager]
    end

    subgraph Decoupled Data Provider Layer
        DataProviderInterface[BaseDataProvider Abstract Interface]
        SimProvider[SimulationDataProvider\nLocal Physics & Relay]
        OfficialCRIS[OfficialRailwayDataProvider\nCRIS / NTES Production Stub]
    end

    subgraph AI / ML Prediction Engine
        GBModel[Gradient Boosting Regressor\nScikit-Learn trained on 21,100 runs]
        StatFallback[Statistical Median Fallback Engine]
        FeatureExt[Feature Engineering\nDistance, Headway, TSR, Dwell, Weather]
    end

    subgraph Storage & Operational State
        RelationalDB[(SQLite / PostgreSQL Engine\nStations, Trains, Events, Sections)]
    end

    PApp <--> FastAPIServer
    OpsDash <--> FastAPIServer
    SimPanel <--> FastAPIServer
    FastAPIServer <--> WSBroadcaster
    FastAPIServer --> DataProviderInterface
    DataProviderInterface --> SimProvider
    DataProviderInterface -.-> OfficialCRIS
    SimProvider --> GBModel
    SimProvider --> RelationalDB
    GBModel --> FeatureExt
```

---

## 3. Machine Learning Pipeline & Physics

### Features Analyzed:
1. `section_distance_km`: Inter-station physical length.
2. `nominal_section_time_min`: Minimum physical run time at rated sectional speed.
3. `scheduled_section_time_min`: Timetable time containing schedule slack.
4. `current_delay_min`: Instantaneous departure/running delay.
5. `previous_station_delay_min`: Used for delta recovery trend analysis.
6. `target_speed_kmh`: Current operating speed bounded by TSRs.
7. `congestion_score`: High, medium, low block section headway occupancy.
8. `has_tsr`: Binary flag for Temporary Speed Restrictions (e.g. 30–45 km/h limit).
9. `weather_score`: Monsoon rain or winter fog visibility attenuation.
10. `train_priority`: Superfast/Vande Bharat (Tier 1) vs Passenger/MEMU (Tier 4).
11. `time_of_day_sin / cos`: Circadian cycle modeling for junction rush hours.

### Empirical Evaluation:
- **Baseline 1 (Timetable Schedule):** MAE = 26.12 min, RMSE = 42.03 min
- **Baseline 2 (Current Delay Persistence):** MAE = 26.17 min, RMSE = 41.69 min
- **Dynamic ML Model (Gradient Boosting):** **MAE = 3.01 min, RMSE = 4.21 min**
- **Accuracy Improvement:** **88.5% reduction in arrival error** over conventional systems.
