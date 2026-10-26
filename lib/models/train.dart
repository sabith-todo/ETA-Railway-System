class TrainModel {
  final String number;
  final String name;
  final String type;
  final String origin;
  final String destination;
  final String departureTime;
  final String arrivalTime;
  final String currentStation;
  final String nextStation;
  final double currentSpeed;
  final double currentDelay;
  final String status;
  final String scheduledEta;
  final String aiPredictedEta;
  final String difference;
  final String riskLevel;
  final List<String> riskReasons;
  final String dataSource;
  final String? lastUpdated;
  final double? currentLat;
  final double? currentLon;
  final double bearing;
  final List<Map<String, dynamic>> schedule;

  TrainModel({
    required this.number,
    required this.name,
    required this.type,
    required this.origin,
    required this.destination,
    required this.departureTime,
    required this.arrivalTime,
    required this.currentStation,
    required this.nextStation,
    required this.currentSpeed,
    required this.currentDelay,
    required this.status,
    required this.scheduledEta,
    required this.aiPredictedEta,
    required this.difference,
    required this.riskLevel,
    required this.riskReasons,
    required this.dataSource,
    this.lastUpdated,
    this.currentLat,
    this.currentLon,
    this.bearing = 0.0,
    this.schedule = const [],
  });

  factory TrainModel.fromJson(Map<String, dynamic> json) {
    List<String> reasons = [];
    if (json["risk_analysis"] is Map && json["risk_analysis"]["reasons"] is List) {
      reasons = List<String>.from(json["risk_analysis"]["reasons"]);
    }

    List<Map<String, dynamic>> sched = [];
    if (json["schedule"] is List) {
      sched = List<Map<String, dynamic>>.from(json["schedule"]);
    }

    String rLevel = "LOW";
    if (json["risk_analysis"] is Map) {
      rLevel = json["risk_analysis"]["level"] ?? "LOW";
    } else if (json["risk_level"] != null) {
      rLevel = json["risk_level"].toString();
    }

    return TrainModel(
      number: json["number"]?.toString() ?? json["train_id"]?.toString() ?? "",
      name: json["name"] ?? json["train_name"] ?? "",
      type: json["type"] ?? "Express",
      origin: json["origin"] ?? "",
      destination: json["destination"] ?? "",
      departureTime: json["departure_time"] ?? "--:--",
      arrivalTime: json["arrival_time"] ?? "--:--",
      currentStation: json["current_station"] ?? json["current_location"] ?? "",
      nextStation: json["next_station"] ?? json["next_station_name"] ?? "",
      currentSpeed: (json["current_speed"] ?? json["current_speed_kmh"] ?? 0.0).toDouble(),
      currentDelay: (json["current_delay"] ?? json["current_delay_min"] ?? 0.0).toDouble(),
      status: (json["status"] ?? "RUNNING").toString().toUpperCase(),
      scheduledEta: json["scheduled_eta"] ?? json["arrival_time"] ?? "--:--",
      aiPredictedEta: json["ai_predicted_eta"] ?? json["predicted_eta"] ?? "--:--",
      difference: json["difference"] ?? json["delay_difference"] ?? "+0 min",
      riskLevel: rLevel,
      riskReasons: reasons,
      dataSource: json["data_source"] ?? "SCHEDULED",
      lastUpdated: json["last_updated"]?.toString(),
      currentLat: json["current_lat"] != null ? (json["current_lat"] as num).toDouble() : null,
      currentLon: json["current_lon"] != null ? (json["current_lon"] as num).toDouble() : null,
      bearing: (json["bearing"] ?? 0.0).toDouble(),
      schedule: sched,
    );
  }
}
