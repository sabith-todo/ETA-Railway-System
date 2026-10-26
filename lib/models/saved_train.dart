class SavedTrainModel {
  final int? id;
  final String trainNumber;
  final String? customLabel;
  final String? name;
  final String? origin;
  final String? destination;
  final String? status;
  final double currentDelay;

  SavedTrainModel({
    this.id,
    required this.trainNumber,
    this.customLabel,
    this.name,
    this.origin,
    this.destination,
    this.status,
    this.currentDelay = 0.0,
  });

  factory SavedTrainModel.fromJson(Map<String, dynamic> json) {
    return SavedTrainModel(
      id: json["saved_id"] ?? json["id"],
      trainNumber: json["number"] ?? json["train_number"] ?? "",
      customLabel: json["custom_label"],
      name: json["name"] ?? json["custom_label"] ?? "Train ${json["number"] ?? json["train_number"]}",
      origin: json["origin"] ?? "",
      destination: json["destination"] ?? "",
      status: json["status"] ?? "RUNNING",
      currentDelay: (json["current_delay_min"] ?? json["current_delay"] ?? 0.0).toDouble(),
    );
  }
}
