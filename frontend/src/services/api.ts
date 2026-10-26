import { TransferStationInfo, PopularConnectionPair, ConnectionCheckResult } from "../types";

const API_BASE = typeof window !== "undefined" && window.location.hostname
  ? `http://${window.location.hostname}:8000/api`
  : "http://localhost:8000/api";

export async function fetchTrainList(search?: string, origin?: string, destination?: string, date?: string) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (origin) params.append("origin", origin);
  if (destination) params.append("destination", destination);
  if (date) params.append("date", date);
  
  const res = await fetch(`${API_BASE}/trains?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch trains");
  return res.json();
}

export async function fetchTrainDetails(trainId: string, date?: string) {
  const url = date ? `${API_BASE}/trains/${trainId}?date=${encodeURIComponent(date)}` : `${API_BASE}/trains/${trainId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Train ${trainId} not found`);
  return res.json();
}

export async function fetchTrainRoute(trainId: string, date?: string) {
  const url = date ? `${API_BASE}/trains/${trainId}/route?date=${encodeURIComponent(date)}` : `${API_BASE}/trains/${trainId}/route`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Route for train ${trainId} not found`);
  return res.json();
}

export async function fetchDynamicETA(trainId: string) {
  const res = await fetch(`${API_BASE}/trains/${trainId}/eta`);
  if (!res.ok) throw new Error(`Dynamic ETA for ${trainId} unavailable`);
  return res.json();
}

export async function fetchTrainForecast(trainId: string) {
  const res = await fetch(`${API_BASE}/trains/${trainId}/forecast`);
  if (!res.ok) throw new Error(`Forecast for ${trainId} unavailable`);
  return res.json();
}

export async function fetchStations() {
  const res = await fetch(`${API_BASE}/stations`);
  if (!res.ok) throw new Error("Failed to fetch stations");
  return res.json();
}

export async function fetchStationArrivals(stationCode: string) {
  const res = await fetch(`${API_BASE}/stations/${stationCode}/arrivals`);
  if (!res.ok) throw new Error(`Failed to fetch arrivals for ${stationCode}`);
  return res.json();
}

export async function fetchSections() {
  const res = await fetch(`${API_BASE}/sections`);
  if (!res.ok) throw new Error("Failed to fetch sections");
  return res.json();
}

export async function fetchDashboardSummary() {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  if (!res.ok) throw new Error("Failed to fetch dashboard summary");
  return res.json();
}

export async function fetchHighRiskTrains() {
  const res = await fetch(`${API_BASE}/dashboard/high-risk-trains`);
  if (!res.ok) throw new Error("Failed to fetch high-risk trains");
  return res.json();
}

export async function fetchDownstreamRipple() {
  const res = await fetch(`${API_BASE}/dashboard/downstream-ripple`);
  if (!res.ok) throw new Error("Failed to fetch ripple data");
  return res.json();
}

export async function fetchModelComparison() {
  const res = await fetch(`${API_BASE}/analytics/model-comparison`);
  if (!res.ok) throw new Error("Failed to fetch model comparison");
  return res.json();
}

export async function fetchFeatureImportance() {
  const res = await fetch(`${API_BASE}/analytics/feature-importance`);
  if (!res.ok) throw new Error("Failed to fetch feature importance");
  return res.json();
}

export async function fetchComparisonSamples() {
  const res = await fetch(`${API_BASE}/analytics/comparison-samples`);
  if (!res.ok) throw new Error("Failed to fetch comparison samples");
  return res.json();
}

export async function fetchErrorDistribution() {
  const res = await fetch(`${API_BASE}/analytics/error-distribution`);
  if (!res.ok) throw new Error("Failed to fetch error distribution");
  return res.json();
}

export async function fetchPopularConnections(): Promise<PopularConnectionPair[]> {
  const res = await fetch(`${API_BASE}/connections/popular`);
  if (!res.ok) throw new Error("Failed to fetch popular connections");
  return res.json();
}

export async function fetchTransferStations(
  arrivingTrainId: string, 
  connectingTrainId: string
): Promise<TransferStationInfo[]> {
  const params = new URLSearchParams({
    arriving_train_id: arrivingTrainId,
    connecting_train_id: connectingTrainId
  });
  const res = await fetch(`${API_BASE}/connections/transfer-stations?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to fetch shared transfer stations");
  }
  return res.json();
}

export async function checkConnectionRisk(payload: {
  arriving_train_id: string;
  connecting_train_id: string;
  transfer_station_code: string;
  minimum_buffer_minutes?: number;
}): Promise<ConnectionCheckResult> {
  const res = await fetch(`${API_BASE}/connections/check-risk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to check connection risk");
  }
  return res.json();
}

export async function computeWhenToLeave(payload: {
  train_id: string;
  station_code: string;
  travel_time_to_station_min: number;
  desired_station_buffer_min: number;
}) {
  const res = await fetch(`${API_BASE}/departure/when-to-leave`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to calculate departure recommendation");
  return res.json();
}

// Simulation Controls
export async function startSimulation() {
  const res = await fetch(`${API_BASE}/simulation/start`, { method: "POST" });
  return res.json();
}

export async function pauseSimulation() {
  const res = await fetch(`${API_BASE}/simulation/pause`, { method: "POST" });
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/simulation/reset`, { method: "POST" });
  return res.json();
}

export async function setSimulationMultiplier(multiplier: number) {
  const res = await fetch(`${API_BASE}/simulation/multiplier?multiplier=${multiplier}`, { method: "POST" });
  return res.json();
}

export async function injectSimulationEvent(event: {
  event_type: string;
  train_id?: string;
  section_id?: string;
  description?: string;
  impact_minutes?: number;
  severity?: string;
}) {
  const res = await fetch(`${API_BASE}/simulation/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event)
  });
  if (!res.ok) throw new Error("Failed to inject simulation event");
  return res.json();
}

// RailRadar Integration Services
export async function fetchRailradarCatalog() {
  const res = await fetch(`${API_BASE}/railradar/catalog`);
  if (!res.ok) throw new Error("Failed to fetch RailRadar catalog");
  return res.json();
}

export async function fetchRailradarStatus() {
  const res = await fetch(`${API_BASE}/railradar/status`);
  if (!res.ok) throw new Error("Failed to fetch RailRadar status");
  return res.json();
}

export async function testRailradarKey(apiKey: string) {
  const res = await fetch(`${API_BASE}/railradar/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey })
  });
  return res.json();
}

export async function fetchTrainCoaches(trainNumber: string, station?: string) {
  const url = station 
    ? `${API_BASE}/railradar/trains/${trainNumber}/coaches?station=${encodeURIComponent(station)}`
    : `${API_BASE}/railradar/trains/${trainNumber}/coaches`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch coach layout");
  return res.json();
}

export async function fetchPnrStatus(pnr: string) {
  const res = await fetch(`${API_BASE}/railradar/pnr/${pnr}`);
  if (!res.ok) throw new Error("Failed to query PNR status");
  return res.json();
}

export async function fetchStationLiveBoard(stationCode: string, windowHours: number = 8) {
  const res = await fetch(`${API_BASE}/stations/${encodeURIComponent(stationCode)}/live-board?window_hours=${windowHours}`);
  if (!res.ok) throw new Error(`Failed to fetch live board for station ${stationCode}`);
  return res.json();
}

export async function fetchSeatLayout(trainNumber: string, coachCode: string, seatNumber: number, layoutType?: string) {
  const params = layoutType ? `?layout_type=${encodeURIComponent(layoutType)}` : "";
  const res = await fetch(`${API_BASE}/railradar/trains/${trainNumber}/coaches/${coachCode}/seat/${seatNumber}${params}`);
  if (!res.ok) throw new Error(`Failed to fetch seat layout for ${coachCode}-${seatNumber}`);
  return res.json();
}

export async function fetchTravelHistory() {
  const res = await fetch(`${API_BASE}/passenger/travel-history`);
  if (!res.ok) throw new Error("Failed to fetch passenger travel history");
  return res.json();
}

export async function recordTravelHistory(journey: any) {
  const res = await fetch(`${API_BASE}/passenger/travel-history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(journey)
  });
  if (!res.ok) throw new Error("Failed to save passenger journey");
  return res.json();
}

export async function deleteTravelHistory(journeyId: string) {
  const res = await fetch(`${API_BASE}/passenger/travel-history/${encodeURIComponent(journeyId)}`, {
    method: "DELETE"
  });
  if (!res.ok) throw new Error("Failed to remove journey record");
  return res.json();
}


