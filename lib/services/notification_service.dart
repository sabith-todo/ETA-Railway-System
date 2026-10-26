import 'dart:async';
import 'package:flutter/material.dart';
import '../models/alert_item.dart';
import 'api_service.dart';

class NotificationService {
  static final StreamController<AlertItemModel> _alertStreamController =
      StreamController<AlertItemModel>.broadcast();

  static Stream<AlertItemModel> get onAlertReceived => _alertStreamController.stream;

  static void notify(AlertItemModel alert) {
    _alertStreamController.add(alert);
  }

  static Future<void> checkTrainAlerts(String trainNumber, double currentDelay, double previousDelay, String currentStation) async {
    final diff = currentDelay - previousDelay;
    if (diff >= 5.0) {
      final msg = "Train $trainNumber delay compounded: +${diff.round()} min near $currentStation.";
      await ApiService.createAlert(trainNumber, msg, alertType: "DELAY_INCREASED");
    }
  }
}
