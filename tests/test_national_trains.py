"""
Integration Tests for National Indian Railways Trains & Universal Train Resolution.
Verifies that trains from across India (Kerala Express, Rajdhani, Shatabdi, etc.)
and arbitrary 5-digit train numbers resolve seamlessly with 200 OK.
"""

import unittest
import sys
import os
from starlette.testclient import TestClient

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from backend.main import app

class TestNationalRailwayAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_national_express_train_details(self):
        """Tests that major national trains across India resolve with complete telemetry."""
        train_numbers = ["12626", "12951", "12301", "12002", "12621", "22691"]
        for num in train_numbers:
            res = self.client.get(f"/api/trains/{num}")
            self.assertEqual(res.status_code, 200, f"Failed for train {num}")
            data = res.json()
            self.assertEqual(data["number"], num)
            self.assertIn("name", data)
            self.assertIn("origin", data)
            self.assertIn("destination", data)

    def test_national_train_routes(self):
        """Tests that national train routes include intermediate junctions and distances."""
        res = self.client.get("/api/trains/12626/route")
        self.assertEqual(res.status_code, 200)
        route = res.json()
        self.assertIn("stations", route)
        self.assertGreaterEqual(len(route["stations"]), 10)
        codes = [s["station_code"] for s in route["stations"]]
        self.assertIn("NDLS", codes)
        self.assertIn("BPL", codes)
        self.assertIn("TVC", codes)

    def test_national_train_dynamic_eta(self):
        """Tests that dynamic ML ETA can be computed for national routes."""
        res = self.client.get("/api/trains/12951/eta")
        self.assertEqual(res.status_code, 200)
        eta = res.json()
        self.assertEqual(eta["train_id"], "12951")
        self.assertIn("predicted_destination_delay_minutes", eta)
        self.assertIn("stations", eta)
        self.assertGreater(len(eta["stations"]), 0)

    def test_arbitrary_train_number_synthesis(self):
        """Tests that any valid 5-digit train number resolves on-demand without 404."""
        arbitrary_num = "12401"
        res = self.client.get(f"/api/trains/{arbitrary_num}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["number"], arbitrary_num)
        self.assertIn("schedule", data)

    def test_national_junction_live_boards(self):
        """Tests live station boards for major Indian junctions (New Delhi, Mumbai, Howrah, etc.)."""
        for code in ["NDLS", "MMCT", "HWH", "SBC"]:
            res = self.client.get(f"/api/stations/{code}/live-board")
            self.assertEqual(res.status_code, 200, f"Live board failed for {code}")
            data = res.json()
            self.assertEqual(data["station_code"], code)
            self.assertIn("trains", data)

    def test_corridor_searches_across_india(self):
        """Tests natural language corridor searches across major Indian cities."""
        queries = ["Delhi to Chennai", "Mumbai to Delhi", "Bangalore to Delhi"]
        for q in queries:
            res = self.client.get(f"/api/trains?search={q}")
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertGreater(data["count"], 0, f"Search '{q}' returned 0 trains")

    def test_when_to_leave_midnight_rollover(self):
        """Tests that departure planner handles cross-midnight journeys without negative time."""
        payload = {
            "train_id": "12626",
            "station_code": "BPL",
            "travel_time_to_station_min": 35,
            "desired_station_buffer_min": 25
        }
        res = self.client.post("/api/departure/when-to-leave", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("recommended_leave_time", data)
        self.assertGreaterEqual(data["time_saved_due_to_delay_min"], 0)

    def test_national_train_coach_composition(self):
        """Tests coach layout generation for national Rajdhani/Superfast trains."""
        res = self.client.get("/api/railradar/trains/12951/coaches")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("coaches", data)
        self.assertGreater(len(data["coaches"]), 10)

    def test_railway_ticket_booking_search_and_fares(self):
        """Tests that ticket booking search computes telescopic fares and availability."""
        res = self.client.get("/api/booking/trains?from_station=MAS&to_station=MDU")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreater(data["count"], 0)
        train = data["trains"][0]
        self.assertIn("classes", train)
        self.assertIn("irctc_official_link", train)
        # Verify classes have fares and status
        for c in train["classes"]:
            self.assertIn("class_code", c)
            self.assertGreater(c["fare"], 0)
            self.assertIn("status", c)

    def test_railway_booking_allocation_and_pnr(self):
        """Tests end-to-end PRS seat reservation, 10-digit PNR allocation, and history sync."""
        payload = {
            "train_number": "12635",
            "from_station": "MS",
            "to_station": "MDU",
            "journey_date": "2026-09-18",
            "class_code": "3A",
            "quota": "GN",
            "passengers": [
                {"name": "Suresh Raina", "age": 34, "gender": "Male", "berth_preference": "Lower"}
            ],
            "contact_email": "suresh@example.com",
            "contact_phone": "9876543210",
            "irctc_user_id": "SURESH_IRCTC"
        }
        res = self.client.post("/api/booking/create", json=payload)
        self.assertEqual(res.status_code, 200)
        ticket = res.json()
        pnr = ticket["pnr"]
        self.assertEqual(len(pnr.replace("-", "")), 10)
        self.assertEqual(ticket["booking_status"], "CONFIRMED")
        self.assertGreater(ticket["total_amount"], 0)
        self.assertIn("coach", ticket["passengers"][0])
        self.assertIn("seat_number", ticket["passengers"][0])

        # Verify query by PNR
        pnr_res = self.client.get(f"/api/booking/pnr/{pnr}")
        self.assertEqual(pnr_res.status_code, 200)
        self.assertEqual(pnr_res.json()["pnr"], pnr)

        # Verify synced into passenger travel history
        hist_res = self.client.get("/api/passenger/travel-history")
        self.assertEqual(hist_res.status_code, 200)
        self.assertEqual(hist_res.json()["journeys"][0]["pnr"], pnr)

if __name__ == "__main__":
    unittest.main()
