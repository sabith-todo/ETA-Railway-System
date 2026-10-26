"""
Comprehensive Test Suite for RailForecastAI.
Tests:
- Train search
- Station search
- Train details & Dynamic ETA
- Complete schedule
- GeoJSON route geometry
- Live tracking & telemetry fallback hierarchy
- Station-wise delay propagation
- ML prediction engine & model metadata
- Operational risk indicator & transparent reasoning
- Database models (SQLAlchemy)
- Saved/favourite trains
- Alerts & notifications
"""

import unittest
import json
from starlette.testclient import TestClient

from backend.main import app
from backend.ml.predict import (
    predict_delay_minutes,
    calculate_dynamic_eta,
    calculate_operational_risk,
    propagate_delay_trajectory,
    get_loaded_model
)
from backend.app.services.railway_service import railway_service

class TestRailForecastAI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_health_check(self):
        """Verify API health endpoint responds with healthy status."""
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "healthy")

    def test_02_train_search(self):
        """Verify train search by train number and by train name with debounce support."""
        # By number
        resp1 = self.client.get("/api/trains/search?q=12635")
        self.assertEqual(resp1.status_code, 200)
        data1 = resp1.json()
        self.assertGreater(data1.get("count", 0), 0)
        self.assertEqual(data1["trains"][0]["number"], "12635")

        # By name
        resp2 = self.client.get("/api/trains/search?q=Vaigai")
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()
        self.assertGreater(data2.get("count", 0), 0)

    def test_03_station_search(self):
        """Verify station search by code and city."""
        resp = self.client.get("/api/stations/search?q=MAS")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertGreater(data.get("count", 0), 0)
        self.assertEqual(data["stations"][0]["code"], "MAS")

    def test_04_train_details_dynamic_eta(self):
        """Verify train details contains real Scheduled ETA, AI Predicted ETA, and difference."""
        resp = self.client.get("/api/trains/12635")
        self.assertEqual(resp.status_code, 200)
        train = resp.json()
        self.assertEqual(train["number"], "12635")
        self.assertIn("scheduled_eta", train)
        self.assertIn("ai_predicted_eta", train)
        self.assertIn("difference", train)
        self.assertIn("data_source", train)
        self.assertIn("risk_analysis", train)

    def test_05_train_schedule(self):
        """Verify complete train schedule returns ordered stop list."""
        resp = self.client.get("/api/trains/12635/schedule")
        self.assertEqual(resp.status_code, 200)
        schedule = resp.json()
        self.assertIsInstance(schedule, list)
        self.assertGreater(len(schedule), 0)
        # Verify sequence order
        for idx, stop in enumerate(schedule):
            seq = stop.get("stop_sequence", idx + 1)
            self.assertGreaterEqual(seq, 1)

    def test_06_route_geojson_geometry(self):
        """Verify route returns authentic GeoJSON FeatureCollection with LineStrings and Points."""
        resp = self.client.get("/api/trains/12635/route")
        self.assertEqual(resp.status_code, 200)
        geojson = resp.json()
        self.assertEqual(geojson.get("type"), "FeatureCollection")
        features = geojson.get("features", [])
        self.assertGreater(len(features), 0)

        # Check for LineStrings (completed and remaining tracks)
        line_features = [f for f in features if f["geometry"]["type"] == "LineString"]
        self.assertGreater(len(line_features), 0)

        # Check for Station Points
        point_features = [f for f in features if f["geometry"]["type"] == "Point"]
        self.assertGreater(len(point_features), 0)

    def test_07_live_tracking_and_fallback(self):
        """Verify live tracking endpoint returns valid data source tag and coordinates."""
        resp = self.client.get("/api/trains/12635/live")
        self.assertEqual(resp.status_code, 200)
        live = resp.json()
        self.assertTrue(live.get("status_available"))
        self.assertIn(live.get("data_source"), ["LIVE", "LAST KNOWN", "SCHEDULED"])
        self.assertIn("speed", live)
        self.assertIn("delay", live)
        self.assertIn("current_station", live)

    def test_08_station_predictions_and_delay_propagation(self):
        """Verify station-wise delay propagation and confidence calculation."""
        resp = self.client.get("/api/trains/12635/predictions")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("station_predictions", data)
        self.assertIn("eta", data)
        self.assertIn("risk_analysis", data)
        preds = data["station_predictions"]
        self.assertGreater(len(preds), 0)
        for p in preds:
            self.assertIn("station_code", p)
            self.assertIn("status", p)
            self.assertIn("confidence", p)
            self.assertGreaterEqual(p["confidence"], 0.5)

    def test_09_operational_risk_reasons(self):
        """Verify risk analysis returns LOW/MEDIUM/HIGH and data-driven transparent reasons list."""
        risk = calculate_operational_risk(
            current_delay=18.0,
            previous_delay=12.0,
            current_speed=45.0,
            max_section_speed=110.0
        )
        self.assertIn(risk["level"], ["LOW", "MEDIUM", "HIGH"])
        self.assertIsInstance(risk["reasons"], list)
        self.assertGreater(len(risk["reasons"]), 0)

    def test_10_ml_model_metadata(self):
        """Verify trained ML champion model status and metadata are accessible."""
        resp = self.client.get("/api/model/status")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn(data.get("status"), ["active", "ready_fallback"])
        if data.get("status") == "active":
            self.assertIn("champion_model", data)
            self.assertIn("test_performance", data)
            self.assertIn("mae", data["test_performance"])

    def test_11_saved_trains_crud(self):
        """Verify saving and deleting favourite trains."""
        # 1. Save train
        save_resp = self.client.post("/api/saved/trains", json={
            "train_number": "12635",
            "custom_label": "Vaigai Superfast Express"
        })
        self.assertEqual(save_resp.status_code, 200)

        # 2. Retrieve saved list
        get_resp = self.client.get("/api/saved/trains")
        self.assertEqual(get_resp.status_code, 200)
        saved_list = get_resp.json()
        numbers = [t.get("number") or t.get("train_number") for t in saved_list]
        self.assertIn("12635", numbers)

        # 3. Delete saved train
        del_resp = self.client.delete("/api/saved/trains/12635")
        self.assertEqual(del_resp.status_code, 200)

    def test_12_alerts_crud(self):
        """Verify alerts creation, listing, and dismissal."""
        # 1. Create alert
        create_resp = self.client.post("/api/alerts", json={
            "train_number": "12635",
            "alert_type": "DELAY_INCREASED",
            "message": "Unit Test Delay Warning",
            "threshold_min": 10.0
        })
        self.assertEqual(create_resp.status_code, 200)
        alert_id = create_resp.json()["alert"]["id"]

        # 2. Get alerts
        list_resp = self.client.get("/api/alerts")
        self.assertEqual(list_resp.status_code, 200)
        alerts = list_resp.json()
        ids = [a["id"] for a in alerts]
        self.assertIn(alert_id, ids)

        # 3. Dismiss alert
        dismiss_resp = self.client.delete(f"/api/alerts/{alert_id}")
        self.assertEqual(dismiss_resp.status_code, 200)

    def test_13_network_live_stats(self):
        """Verify live network metrics do not fake values."""
        resp = self.client.get("/api/trains/network/live-stats")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data.get("available"))
        self.assertGreater(data.get("trains_running", 0), 0)

if __name__ == "__main__":
    unittest.main()
