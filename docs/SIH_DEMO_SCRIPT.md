# Smart India Hackathon (SIH) Live Demo Script

**Problem Statement ID:** 26028  
**Title:** Dynamic Forecast of Expected Time of Arrival (ETA) for Coaching Trains  
**Ministry:** Ministry of Railways | **Category:** Software | **Theme:** Smart Automation  

---

## The 22-Step SIH Evaluation Workflow

Follow this live presentation script during jury evaluation:

### Phase 1: Passenger Portal & Differentiator Demo
1. **Search Train 12627:** Open the passenger homepage (`http://localhost:5173`) and search for `12627` (Karnataka Express).
2. **Open Live Train Details:** Click on Train 12627 to view the detailed operational dashboard.
3. **Current Location:** Note the live location: *"Near Salem Jn"* running at `74 km/h`.
4. **Current Delay:** Highlight that existing commercial apps only report: *"Current delay: +18 min"*.
5. **Dynamic ETA Table:** Point to the upcoming stations (Salem, Erode, Tiruppur, Coimbatore). Show scheduled vs predicted times.
6. **Destination ETA:** Highlight predicted delay at terminus: `+31 min` (destination arrival: `00:31`).
7. **Confidence & Bounds:** Show the uncertainty interval: `19:37 – 19:49` with `84%` confidence. Explain that ETA is a dynamic forecast based on physics, not a flat guarantee.
8. **Open Forecast:** Navigate to `/train/12627/forecast`.
9. **Delay Propagation Curve:** Present the interactive chart showing delay compounding along sections (`+18m → +21m → +26m → +29m → +31m`).
10. **Live Map:** View `/map` to show the railway route with stations and animated train beacon.

---

### Phase 2: Real-Time Simulator & Live Recalculation
11. **Open Simulator:** Navigate to `/simulator` (or use the bottom panel on the train details page).
12. **Trigger Heavy Congestion:** Click `[+ Congestion]` on section `SEC_SA_ED` (+16 min delay).
13. **Live Recalculation:** Watch the UI dynamically update instantly via WebSocket:
    - Destination delay jumps from `+31 min` to `+47 min`.
    - Downstream ETAs advance by +16 minutes.
    - Confidence decreases to reflect increased variance.
    - A toast alert pops up: *"Dynamic Disruption Triggered: Heavy train traffic congestion"*.
14. **Trigger Speed Restriction (TSR):** Click `[+ Speed Restriction]` (+6 min delay).
15. **Observe Compounding Impact:** The model accounts for the 35 km/h restriction, further adjusting destination ETA.
16. **Trigger Delay Recovery / Clear:** Click `[Delay Recovery]`.
17. **Demonstrate Recovery:** Show how the system detects the green corridor clearance and updates: *"Train is currently recovering approximately 4–5 minutes per section"*, pulling the ETA forward.

---

### Phase 3: Operations Control Room & Downstream Network Ripple
18. **Open Operations Dashboard:** Navigate to `/operations`.
19. **Affected Trains & Headway Bottlenecks:** Show total active trains, on-time ratio, congested sections, and speed restrictions.
20. **Cascading Downstream Ripple:** Demonstrate the simplified network model showing how Train 12627's delay occupied the block section, forcing precedence holds on trailing rakes (e.g. Train 12675).

---

### Phase 4: AI / ML Empirical Validation
21. **Open Analytics Dashboard:** Navigate to `/analytics`.
22. **Present Model Benchmarks:**
    - Static Timetable Baseline: **MAE = 26.12 min**
    - Current Delay Persistence Heuristic: **MAE = 26.17 min**
    - Dynamic ML Model (Gradient Boosting): **MAE = 3.01 min (88.5% reduction in error)**
    - Point out the empirical feature importances and error distribution on 4,220 out-of-sample test runs.
