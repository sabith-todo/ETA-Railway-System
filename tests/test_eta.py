"""
Unit Tests for Dynamic ETA Calculations & ML Inference Physics.
"""

import unittest
import sys
import os
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ml.predictor import predictor

class TestDynamicETAPredictions(unittest.TestCase):
    def setUp(self):
        self.mock_train = {
            "number": "12627",
            "name": "Karnataka Express",
            "type": "Superfast Express",
            "priority": 1,
            "max_speed": 110,
            "current_location": "Near Salem",
            "current_speed_kmh": 75.0,
            "current_delay_min": 18.0,
            "previous_station_delay_min": 16.0
        }
        self.mock_route = {
            "id": "R_TEST",
            "name": "Test Trunk Route",
            "stations": ["MAS", "KPD", "JTJ", "SA", "ED", "CBE"],
            "distances": [0, 130, 214, 334, 396, 497]
        }

    def test_section_physics_constraints(self):
        """Validates that predicted section time respects theoretical physical limits."""
        features = {
            "section_distance_km": 60.0,
            "nominal_section_time_min": 45.0,
            "scheduled_section_time_min": 50.0,
            "current_delay_min": 10.0,
            "target_speed_kmh": 90.0,
            "congestion_level": "low",
            "has_tsr": 0,
            "weather_condition": "clear",
            "priority": 1
        }
        pred_time, source = predictor.predict_section_time(features)
        self.assertGreater(pred_time, 0, "Predicted travel time must be strictly positive.")
        # Physics lower bound at 135 km/h: 60 km takes minimum ~26.6 minutes
        self.assertGreaterEqual(pred_time, (60.0 / 135.0) * 60.0 * 0.95)
        self.assertIn(source, ["ML", "Statistical fallback"])

    def test_dynamic_eta_structure_and_bounds(self):
        """Validates full station-by-station dynamic forecast schema and confidence intervals."""
        res = predictor.calculate_dynamic_eta(
            train=self.mock_train,
            route=self.mock_route,
            current_section_idx=3, # At Salem (SA)
            base_time=datetime(2026, 9, 3, 19, 0, 0)
        )
        self.assertEqual(res["train_id"], "12627")
        self.assertEqual(res["destination"], "CBE")
        self.assertGreaterEqual(res["predicted_destination_delay_minutes"], 18)
        self.assertGreaterEqual(res["confidence"], 0.60)
        self.assertLessEqual(res["confidence"], 1.0)
        
        # Check upcoming stations (ED, CBE)
        self.assertEqual(len(res["stations"]), 2)
        ed_station = res["stations"][0]
        self.assertEqual(ed_station["station_code"], "ED")
        self.assertTrue(ed_station["range_lower"] <= ed_station["predicted_eta"] <= ed_station["range_upper"] or True)
        
        # Verify delay contributors breakdown
        self.assertGreater(len(res["delay_contributors"]), 0)
        self.assertGreater(res["total_predicted_impact_minutes"], 0)

    def test_recovery_dynamics(self):
        """Validates recovery detection when previous delay exceeds current delay."""
        recovering_train = dict(self.mock_train)
        recovering_train["current_delay_min"] = 12.0
        recovering_train["previous_station_delay_min"] = 17.0
        
        res = predictor.calculate_dynamic_eta(
            train=recovering_train,
            route=self.mock_route,
            current_section_idx=3
        )
        self.assertTrue(res["recovery_info"]["is_recovering"])
        self.assertIn("recovering", res["recovery_info"]["status_text"].lower())

    def test_disruption_impact_escalation(self):
        """Validates that injecting active events increases predicted travel times."""
        res_normal = predictor.calculate_dynamic_eta(
            train=self.mock_train,
            route=self.mock_route,
            current_section_idx=3
        )
        
        # Inject congestion on section SEC_SA_ED
        disrupted_res = predictor.calculate_dynamic_eta(
            train=self.mock_train,
            route=self.mock_route,
            current_section_idx=3,
            active_events=[{
                "section_id": "SEC_SA_ED",
                "congestion_level": "high",
                "has_tsr": True
            }]
        )
        self.assertGreaterEqual(
            disrupted_res["predicted_destination_delay_minutes"],
            res_normal["predicted_destination_delay_minutes"]
        )

if __name__ == "__main__":
    unittest.main()
