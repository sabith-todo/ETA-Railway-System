import 'package:flutter/foundation.dart';
import '../models/prediction.dart';
import '../services/api_service.dart';

class PredictionProvider extends ChangeNotifier {
  bool _isLoading = false;
  String? _errorMessage;
  List<StationPrediction> _predictions = [];
  Map<String, dynamic>? _etaData;
  Map<String, dynamic>? _riskData;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  List<StationPrediction> get predictions => _predictions;
  Map<String, dynamic>? get etaData => _etaData;
  Map<String, dynamic>? get riskData => _riskData;

  Future<void> loadPredictions(String trainNumber) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiService.getTrainPredictions(trainNumber);
      if (res["station_predictions"] is List) {
        _predictions = (res["station_predictions"] as List)
            .map((e) => StationPrediction.fromJson(e))
            .toList();
      }
      _etaData = res["eta"] as Map<String, dynamic>?;
      _riskData = res["risk_analysis"] as Map<String, dynamic>?;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString().replaceAll("Exception: ", "");
      notifyListeners();
    }
  }
}
