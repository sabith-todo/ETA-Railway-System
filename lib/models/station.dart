class StationModel {
  final String code;
  final String name;
  final String city;
  final String state;
  final double lat;
  final double lon;
  final int platforms;
  final String zone;

  StationModel({
    required this.code,
    required this.name,
    required this.city,
    required this.state,
    required this.lat,
    required this.lon,
    this.platforms = 2,
    this.zone = "SR",
  });

  factory StationModel.fromJson(Map<String, dynamic> json) {
    return StationModel(
      code: json["code"] ?? "",
      name: json["name"] ?? "",
      city: json["city"] ?? "",
      state: json["state"] ?? "",
      lat: (json["lat"] ?? 13.08).toDouble(),
      lon: (json["lon"] ?? 80.27).toDouble(),
      platforms: json["platforms"] ?? 2,
      zone: json["zone"] ?? "SR",
    );
  }
}
