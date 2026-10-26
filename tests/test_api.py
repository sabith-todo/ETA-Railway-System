"""
Integration Tests for FastAPI Endpoints.
"""

import unittest
import sys
import os
from starlette.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.main import app

class TestRailwayAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_check(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["sih_problem_id"], "26028")

    def test_list_trains(self):
        res = self.client.get("/api/trains?limit=5")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("trains", data)
        self.assertGreater(len(data["trains"]), 0)

    def test_train_details_and_route(self):
        res = self.client.get("/api/trains/12627")
        self.assertEqual(res.status_code, 200)
        train = res.json()
        self.assertEqual(train["number"], "12627")
        self.assertIn("route_id", train)

        # Route timeline
        r_res = self.client.get("/api/trains/12627/route")
        self.assertEqual(r_res.status_code, 200)
        route = r_res.json()
        self.assertIn("stations", route)
        self.assertGreater(len(route["stations"]), 0)

    def test_dynamic_eta_endpoint(self):
        res = self.client.get("/api/trains/12627/eta")
        self.assertEqual(res.status_code, 200)
        eta = res.json()
        self.assertEqual(eta["train_id"], "12627")
        self.assertIn("predicted_destination_delay_minutes", eta)
        self.assertIn("confidence", eta)
        self.assertIn("stations", eta)
        self.assertIn("delay_contributors", eta)

    def test_forecast_endpoint(self):
        res = self.client.get("/api/trains/12627/forecast")
        self.assertEqual(res.status_code, 200)
        fc = res.json()
        self.assertIn("delay_progression", fc)
        self.assertIn("delay_contributors", fc)

    def test_stations_and_arrivals(self):
        res = self.client.get("/api/stations?query=Salem")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(len(data["stations"]), 1)

        arr_res = self.client.get("/api/stations/SA/arrivals")
        self.assertEqual(arr_res.status_code, 200)

    def test_operations_dashboard_endpoints(self):
        sum_res = self.client.get("/api/dashboard/summary")
        self.assertEqual(sum_res.status_code, 200)
        summary = sum_res.json()
        self.assertIn("total_active_trains", summary)

        hrt_res = self.client.get("/api/dashboard/high-risk-trains")
        self.assertEqual(hrt_res.status_code, 200)

        rip_res = self.client.get("/api/dashboard/downstream-ripple")
        self.assertEqual(rip_res.status_code, 200)

    def test_analytics_endpoints(self):
        comp_res = self.client.get("/api/analytics/model-comparison")
        self.assertEqual(comp_res.status_code, 200)
        comp = comp_res.json()
        self.assertIn("static_schedule", comp)
        self.assertIn("dynamic_ml_model", comp)

    def test_connection_risk_evaluation(self):
        payload = {
            "arriving_train_id": "12627",
            "connecting_train_id": "12675",
            "transfer_station_code": "SA",
            "minimum_buffer_minutes": 15
        }
        res = self.client.post("/api/connections/check-risk", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn(data["status"], ["Likely", "Moderate Risk", "At Risk", "Missed"])

    def test_when_to_leave_departure(self):
        payload = {
            "train_id": "12627",
            "station_code": "SA",
            "travel_time_to_station_min": 30,
            "desired_station_buffer_min": 20
        }
        res = self.client.post("/api/departure/when-to-leave", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("recommended_leave_time", data)

    def test_simulation_event_injection(self):
        payload = {
            "event_type": "signal_delay",
            "train_id": "12627",
            "section_id": "SEC_SA_ED",
            "description": "Signal failure near Salem junction",
            "impact_minutes": 10.0,
            "severity": "Moderate"
        }
        res = self.client.post("/api/simulation/events", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["event_type"], "signal_delay")
        self.assertIn("updated_eta", data)

    def test_station_live_board(self):
        res = self.client.get("/api/stations/TPJ/live-board?window_hours=8")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["station_code"], "TPJ")
        self.assertIn("trains", data)
        self.assertGreater(data["total_trains"], 0)
        first_t = data["trains"][0]
        self.assertIn("platform", first_t)
        self.assertIn("predicted_time", first_t)
        self.assertIn("operational_status", first_t)

    def test_coach_composition(self):
        # Test Superfast Express Rake (Vaigai 12635)
        res = self.client.get("/api/railradar/trains/12635/coaches?station=TPJ")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["train_number"], "12635")
        self.assertGreater(data["total_coaches"], 15)
        self.assertIn("coaches", data)
        codes = [c["code"] for c in data["coaches"]]
        self.assertIn("LOCO", codes)
        self.assertIn("B1", codes)

        # Test Vande Bharat (20643)
        vb_res = self.client.get("/api/railradar/trains/20643/coaches")
        self.assertEqual(vb_res.status_code, 200)
        vb_data = vb_res.json()
        self.assertIn("Vande Bharat", vb_data["rake_type"])
        self.assertEqual(vb_data["total_coaches"], 8)

    def test_seat_enquiry(self):
        res = self.client.get("/api/railradar/trains/12635/coaches/B2/seat/42?layout_type=8_berth_sleeper")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["seat_number"], 42)
        self.assertEqual(data["coach_code"], "B2")
        self.assertEqual(data["berth_type"], "Middle Berth")
        self.assertEqual(data["berth_short"], "MB")

    def test_passenger_travel_history(self):
        res = self.client.get("/api/passenger/travel-history")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("journeys", data)
        self.assertGreater(data["total_journeys"], 0)
        self.assertGreater(data["total_distance_km"], 0)
        first_j = data["journeys"][0]
        self.assertIn("train_number", first_j)
        self.assertIn("coach", first_j)
        self.assertIn("seat_number", first_j)

if __name__ == "__main__":
    unittest.main()

