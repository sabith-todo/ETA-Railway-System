import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/train.dart';
import '../models/live_status.dart';
import '../services/api_service.dart';
import '../services/train_service.dart';

class TrackingProvider extends ChangeNotifier {
  String? _activeTrainNumber;
  TrainModel? _activeTrain;
  LiveStatusModel? _liveStatus;
  Map<String, dynamic>? _routeGeoJson;

  bool _isLoading = false;
  String? _errorMessage;
  DateTime? _lastFetchTime;
  int _secondsSinceUpdate = 0;
  Timer? _pollingTimer;
  Timer? _tickerTimer;

  int pollingIntervalSeconds = 60;

  String? get activeTrainNumber => _activeTrainNumber;
  TrainModel? get activeTrain => _activeTrain;
  LiveStatusModel? get liveStatus => _liveStatus;
  Map<String, dynamic>? get routeGeoJson => _routeGeoJson;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  DateTime? get lastFetchTime => _lastFetchTime;
  int get secondsSinceUpdate => _secondsSinceUpdate;

  bool get isLiveAvailable => _liveStatus != null && _liveStatus!.statusAvailable && _liveStatus!.isLive;

  TrackingProvider() {
    _startTicker();
  }

  void _startTicker() {
    _tickerTimer?.cancel();
    _tickerTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_lastFetchTime != null) {
        _secondsSinceUpdate = DateTime.now().difference(_lastFetchTime!).inSeconds;
        notifyListeners();
      }
    });
  }

  void selectTrain(String trainNumber) {
    _activeTrainNumber = trainNumber;
    fetchTrackingData(trainNumber);
    _startPolling(trainNumber);
  }

  void _startPolling(String trainNumber) {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(Duration(seconds: pollingIntervalSeconds), (_) {
      fetchLiveStatusOnly(trainNumber);
    });
  }

  Future<void> fetchTrackingData(String trainNumber) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final trainFuture = ApiService.getTrainDetails(trainNumber);
      final liveFuture = ApiService.getTrainLiveStatus(trainNumber);
      final routeFuture = ApiService.getTrainRoute(trainNumber);

      final results = await Future.wait([trainFuture, liveFuture, routeFuture]);

      _activeTrain = results[0] as TrainModel;
      _liveStatus = results[1] as LiveStatusModel;
      _routeGeoJson = results[2] as Map<String, dynamic>;

      TrainService.cacheTrain(_activeTrain!);
      TrainService.cacheLiveStatus(trainNumber, _liveStatus!);

      _lastFetchTime = DateTime.now();
      _secondsSinceUpdate = 0;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _errorMessage = "Unable to retrieve live data.";
      // Fallback to cache if available
      _activeTrain = TrainService.getCachedTrain(trainNumber) ?? _activeTrain;
      _liveStatus = TrainService.getCachedLiveStatus(trainNumber) ?? _liveStatus;
      notifyListeners();
    }
  }

  Future<void> fetchLiveStatusOnly(String trainNumber) async {
    try {
      final live = await ApiService.getTrainLiveStatus(trainNumber);
      _liveStatus = live;
      TrainService.cacheLiveStatus(trainNumber, live);
      _lastFetchTime = DateTime.now();
      _secondsSinceUpdate = 0;
      notifyListeners();
    } catch (e) {
      // Retain last known telemetry
    }
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _tickerTimer?.cancel();
    super.dispose();
  }
}
