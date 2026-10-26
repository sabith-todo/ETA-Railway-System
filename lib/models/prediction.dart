class StationPrediction {
  final int sequence;
  final String stationCode;
  final String stationName;
  final String status; // PASSED, CURRENT, UPCOMING
  final String scheduledArrival;
  final String predictedArrival;
  final double delayMinutes;
  final double confidence;

  StationPrediction({
    required this.sequence,
    required this.stationCode,
    required this.stationName,
    required this.status,
    required this.scheduledArrival,
    required this.predictedArrival,
    required this.delayMinutes,
    required this.confidence,
  });

  factory StationPrediction.fromJson(Map<String, dynamic> json) {
    return StationPrediction(
      sequence: json["sequence"] ?? 1,
      stationCode: json["station_code"] ?? "",
      stationName: json["station_name"] ?? json["station_code"] ?? "",
      status: (json["status"] ?? "UPCOMING").toString().toUpperCase(),
      scheduledArrival: json["scheduled_arrival"] ?? "--:--",
      predictedArrival: json["predicted_arrival"] ?? json["actual_arrival"] ?? "--:--",
      delayMinutes: (json["delay_min"] ?? json["delay_minutes"] ?? 0.0).toDouble(),
      confidence: (json["confidence"] ?? 0.85).toDouble(),
    );
  }
}
