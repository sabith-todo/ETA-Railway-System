class LiveStatusModel {
  final bool statusAvailable;
  final String trainNumber;
  final double? latitude;
  final double? longitude;
  final double speed;
  final double bearing;
  final String currentStation;
  final String nextStation;
  final double delay;
  final String dataSource; // LIVE, LAST KNOWN, SCHEDULED, DATA UNAVAILABLE
  final String? lastUpdated;
  final int updatedSecondsAgo;
  final String message;

  LiveStatusModel({
    required this.statusAvailable,
    required this.trainNumber,
    this.latitude,
    this.longitude,
    required this.speed,
    required this.bearing,
    required this.currentStation,
    required this.nextStation,
    required this.delay,
    required this.dataSource,
    this.lastUpdated,
    required this.updatedSecondsAgo,
    required this.message,
  });

  bool get isLive => dataSource == "LIVE";
  bool get isLastKnown => dataSource == "LAST KNOWN";
  bool get isScheduled => dataSource == "SCHEDULED";
  bool get hasCoordinates => latitude != null && longitude != null;

  factory LiveStatusModel.fromJson(Map<String, dynamic> json) {
    return LiveStatusModel(
      statusAvailable: json["status_available"] ?? true,
      trainNumber: json["train_number"]?.toString() ?? "",
      latitude: json["latitude"] != null ? (json["latitude"] as num).toDouble() : null,
      longitude: json["longitude"] != null ? (json["longitude"] as num).toDouble() : null,
      speed: (json["speed"] ?? 0.0).toDouble(),
      bearing: (json["bearing"] ?? 0.0).toDouble(),
      currentStation: json["current_station"] ?? "",
      nextStation: json["next_station"] ?? "",
      delay: (json["delay"] ?? 0.0).toDouble(),
      dataSource: json["data_source"] ?? "SCHEDULED",
      lastUpdated: json["last_updated"]?.toString(),
      updatedSecondsAgo: json["updated_seconds_ago"] ?? 0,
      message: json["message"] ?? "",
    );
  }
}
