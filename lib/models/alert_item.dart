class AlertItemModel {
  final int id;
  final String trainNumber;
  final String alertType;
  final String message;
  final double thresholdMin;
  final bool isTriggered;
  final String? createdAt;

  AlertItemModel({
    required this.id,
    required this.trainNumber,
    required this.alertType,
    required this.message,
    required this.thresholdMin,
    required this.isTriggered,
    this.createdAt,
  });

  factory AlertItemModel.fromJson(Map<String, dynamic> json) {
    return AlertItemModel(
      id: json["id"] ?? 0,
      trainNumber: json["train_number"] ?? "",
      alertType: json["alert_type"] ?? "DELAY_INCREASED",
      message: json["message"] ?? "",
      thresholdMin: (json["threshold_min"] ?? 10.0).toDouble(),
      isTriggered: json["is_triggered"] ?? true,
      createdAt: json["created_at"]?.toString(),
    );
  }
}
