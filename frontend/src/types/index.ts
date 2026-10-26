export interface ScheduleEntry {
  station_code: string;
  station_name: string;
  scheduled_arrival: string;
  scheduled_departure: string;
  platform: string;
  distance_km: number;
  day: number;
}

export interface Train {
  number: string;
  name: string;
  type: string;
  route_id: string;
  origin: string;
  destination: string;
  departure_time?: string;
  arrival_time?: string;
  schedule?: ScheduleEntry[];
  total_distance_km?: number;
  average_speed_kmh?: number;
  priority: number;
  max_speed: number;
  current_station_idx: number;
  current_location: string;
  current_lat?: number;
  current_lon?: number;
  current_speed_kmh: number;
  current_delay_min: number;
  previous_station_delay_min: number;
  status: string;
  risk_level: string;
  route_name?: string;
  updated_at?: string;
  boarding_time?: string;
  debarking_time?: string;
  boarding_station_name?: string;
  debarking_station_name?: string;
  boarding_platform?: string;
  debarking_platform?: string;
  corridor_distance_km?: number;
  duration_formatted?: string;
  departure_formatted?: string;
  arrival_formatted?: string;
  journey_date?: string;
  journey_date_formatted?: string;
  is_future_date?: boolean;
  service_status?: 'LIVE_RUNNING' | 'SCHEDULED';
  runs_daily?: boolean;
  runs_days?: string[];
  next_station_code?: string;
  next_station_name?: string;
}

export interface RouteStation {
  station_code: string;
  station_name: string;
  city: string;
  lat?: number;
  lon?: number;
  distance_km: number;
  platforms: number;
  platform?: string;
  scheduled_arrival?: string;
  scheduled_departure?: string;
  predicted_arrival?: string;
  delay_minutes?: number;
  day?: number;
  status: 'Passed' | 'Current' | 'Upcoming';
  is_current: boolean;
}

export interface StationETARow {
  station_code: string;
  station_name?: string;
  station_index: number;
  distance_from_origin_km: number;
  scheduled_eta: string;
  predicted_eta: string;
  platform?: string;
  delay_minutes: number;
  confidence: number;
  confidence_percent: number;
  range_lower: string;
  range_upper: string;
  predicted_section_time_min?: number;
  engine_source: string;
}

export interface DelayContributor {
  factor: string;
  impact_minutes: number;
  category: string;
}

export interface RecoveryInfo {
  is_recovering: boolean;
  recovery_rate_per_section: number;
  status_text: string;
}

export interface DynamicETAResponse {
  train_id: string;
  train_name: string;
  current_location: string;
  current_speed_kmh: number;
  current_delay_minutes: number;
  destination: string;
  destination_name?: string;
  predicted_destination_delay_minutes: number;
  expected_additional_delay_minutes: number;
  predicted_eta: string;
  confidence: number;
  confidence_percent: number;
  prediction_range: {
    lower: string;
    upper: string;
  };
  recovery_info: RecoveryInfo;
  delay_contributors: DelayContributor[];
  total_predicted_impact_minutes: number;
  stations: StationETARow[];
  prediction_source: string;
  last_updated: string;
}

export interface Station {
  code: string;
  name: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  platforms: number;
  zone: string;
}

export interface StationArrival {
  train_number: string;
  train_name: string;
  train_type: string;
  origin: string;
  destination: string;
  scheduled_arrival: string;
  predicted_arrival: string;
  delay_minutes: number;
  confidence_percent: number;
  platform: number;
  status: string;
}

export interface DashboardSummary {
  total_active_trains: number;
  on_time_trains: number;
  delayed_trains: number;
  severely_delayed_trains: number;
  high_risk_trains: number;
  congested_sections: number;
  active_speed_restrictions: number;
  predicted_network_impact_min: number;
}

export interface HighRiskTrain extends Train {
  risk_color: 'green' | 'yellow' | 'orange' | 'red';
  risk_category: string;
  risk_reason: string;
  predicted_dest_delay: number;
}

export interface CascadingChain {
  primary_train: {
    number: string;
    name: string;
    location: string;
    delay_minutes: number;
  };
  cascade_steps: Array<{
    stage: number;
    event: string;
    impact: string;
  }>;
  estimated_network_loss_minutes: number;
}

export interface ModelComparison {
  static_schedule: {
    name: string;
    mae_minutes: number;
    rmse_minutes: number;
    mape_percent: number;
    description: string;
  };
  current_delay_method: {
    name: string;
    mae_minutes: number;
    rmse_minutes: number;
    mape_percent: number;
    description: string;
  };
  dynamic_ml_model: {
    name: string;
    mae_minutes: number;
    rmse_minutes: number;
    mape_percent: number;
    accuracy_improvement_percent: number;
    description: string;
  };
}

export interface ComparisonSample {
  section: string;
  train: string;
  actual_time: number;
  static_schedule_time: number;
  current_delay_heuristic: number;
  ml_predicted_time: number;
  congestion: string;
  has_tsr: boolean;
  weather: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface SimulationEvent {
  id: string;
  event_type: string;
  train_id: string;
  section_id: string;
  description: string;
  impact_minutes: number;
  severity: string;
  timestamp: string;
  updated_eta?: DynamicETAResponse;
  downstream_ripple?: Array<{
    train_id: string;
    train_name: string;
    induced_delay_minutes: number;
    new_delay_minutes: number;
    cause: string;
  }>;
}

export interface TransferStationInfo {
  station_code: string;
  station_name: string;
  city: string;
  state?: string;
}

export interface PopularConnectionPair {
  id: string;
  title: string;
  arriving_train_id: string;
  arriving_train_name: string;
  connecting_train_id: string;
  connecting_train_name: string;
  transfer_station_code: string;
  transfer_station_name: string;
  description: string;
}

export interface ConnectionCheckResult {
  arriving_train_id: string;
  arriving_train_name: string;
  predicted_arrival_time: string;
  scheduled_arrival_time?: string;
  arriving_delay_minutes?: number;
  arriving_confidence_percent?: number;
  connecting_train_id: string;
  connecting_train_name: string;
  scheduled_departure_time: string;
  predicted_departure_time?: string;
  connecting_delay_minutes?: number;
  connecting_confidence_percent?: number;
  transfer_station: string;
  transfer_station_name?: string;
  scheduled_transfer_minutes?: number;
  available_transfer_minutes: number;
  buffer_margin_minutes: number;
  platform_arriving?: number;
  platform_connecting?: number;
  cross_platform_transfer?: boolean;
  status: "Likely" | "Moderate Risk" | "At Risk" | "Missed";
  recommendation: string;
}
