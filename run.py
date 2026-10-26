"""
Simple runner for RailForecastAI backend server.
Handles PYTHONPATH and working directory resolution automatically.
"""

import os
import sys
import uvicorn

# Resolve root directory
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

if __name__ == "__main__":
    print("=" * 60)
    print("Starting RailForecastAI Backend Server...")
    print(f"Project Root: {ROOT_DIR}")
    print("API Documentation: http://localhost:8000/docs")
    print("Health Check:      http://localhost:8000/api/health")
    print("=" * 60)
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True, app_dir=ROOT_DIR)
