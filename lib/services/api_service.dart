import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../models/train.dart';
import '../models/station.dart';
import '../models/prediction.dart';
import '../models/live_status.dart';
import '../models/saved_train.dart';
import '../models/alert_item.dart';

class ApiService {
  static Future<Map<String, dynamic>> checkHealth() async {
    final res = await ApiClient.get(ApiEndpoints.health);
    return res is Map<String, dynamic> ? res : {};
  }

  static Future<List<TrainModel>> searchTrains(String query) async {
    final url = "${ApiEndpoints.searchTrains}?q=${Uri.encodeComponent(query)}";
    final res = await ApiClient.get(url);
    if (res is Map && res["trains"] is List) {
      return (res["trains"] as List).map((e) => TrainModel.fromJson(e)).toList();
    }
    return [];
  }

  static Future<List<StationModel>> searchStations(String query) async {
    final url = "${ApiEndpoints.searchStations}?q=${Uri.encodeComponent(query)}";
    final res = await ApiClient.get(url);
    if (res is Map && res["stations"] is List) {
      return (res["stations"] as List).map((e) => StationModel.fromJson(e)).toList();
    }
    return [];
  }

  static Future<TrainModel> getTrainDetails(String trainNumber) async {
    final url = ApiEndpoints.trainDetails(trainNumber);
    final res = await ApiClient.get(url);
    return TrainModel.fromJson(res);
  }

  static Future<List<Map<String, dynamic>>> getTrainSchedule(String trainNumber) async {
    final url = ApiEndpoints.trainSchedule(trainNumber);
    final res = await ApiClient.get(url);
    if (res is List) {
      return List<Map<String, dynamic>>.from(res);
    }
    return [];
  }

  static Future<Map<String, dynamic>> getTrainRoute(String trainNumber) async {
    final url = ApiEndpoints.trainRoute(trainNumber);
    final res = await ApiClient.get(url);
    return res is Map<String, dynamic> ? res : {};
  }

  static Future<LiveStatusModel> getTrainLiveStatus(String trainNumber) async {
    final url = ApiEndpoints.trainLive(trainNumber);
    final res = await ApiClient.get(url);
    return LiveStatusModel.fromJson(res);
  }

  static Future<Map<String, dynamic>> getTrainPredictions(String trainNumber) async {
    final url = ApiEndpoints.trainPredictions(trainNumber);
    final res = await ApiClient.get(url);
    return res is Map<String, dynamic> ? res : {};
  }

  static Future<Map<String, dynamic>> getLiveNetworkStats() async {
    final url = ApiEndpoints.networkStats;
    final res = await ApiClient.get(url);
    return res is Map<String, dynamic> ? res : {};
  }

  static Future<List<SavedTrainModel>> getSavedTrains() async {
    final url = ApiEndpoints.savedTrains;
    final res = await ApiClient.get(url);
    if (res is List) {
      return res.map((e) => SavedTrainModel.fromJson(e)).toList();
    }
    return [];
  }

  static Future<void> saveTrain(String trainNumber, {String? customLabel}) async {
    final url = ApiEndpoints.savedTrains;
    await ApiClient.post(url, body: {
      "train_number": trainNumber,
      "custom_label": customLabel,
    });
  }

  static Future<void> removeSavedTrain(String trainNumber) async {
    final url = ApiEndpoints.savedTrainDelete(trainNumber);
    await ApiClient.delete(url);
  }

  static Future<List<AlertItemModel>> getAlerts() async {
    final url = ApiEndpoints.alerts;
    final res = await ApiClient.get(url);
    if (res is List) {
      return res.map((e) => AlertItemModel.fromJson(e)).toList();
    }
    return [];
  }

  static Future<void> createAlert(String trainNumber, String message, {String alertType = "DELAY_INCREASED"}) async {
    final url = ApiEndpoints.alerts;
    await ApiClient.post(url, body: {
      "train_number": trainNumber,
      "message": message,
      "alert_type": alertType,
    });
  }

  static Future<void> dismissAlert(int alertId) async {
    final url = ApiEndpoints.alertDelete(alertId);
    await ApiClient.delete(url);
  }

  static Future<Map<String, dynamic>> getModelStatus() async {
    final url = ApiEndpoints.modelStatus;
    final res = await ApiClient.get(url);
    return res is Map<String, dynamic> ? res : {};
  }
}
