import 'dart:convert';
import '../models/train.dart';
import '../models/live_status.dart';

class TrainService {
  static final Map<String, TrainModel> _cachedTrains = {};
  static final Map<String, LiveStatusModel> _cachedLiveStatus = {};
  static final List<String> _recentTrainNumbers = [];

  static void cacheTrain(TrainModel train) {
    _cachedTrains[train.number] = train;
    if (!_recentTrainNumbers.contains(train.number)) {
      _recentTrainNumbers.insert(0, train.number);
      if (_recentTrainNumbers.length > 10) {
        _recentTrainNumbers.removeLast();
      }
    }
  }

  static void cacheLiveStatus(String trainNumber, LiveStatusModel status) {
    _cachedLiveStatus[trainNumber] = status;
  }

  static TrainModel? getCachedTrain(String trainNumber) {
    return _cachedTrains[trainNumber];
  }

  static LiveStatusModel? getCachedLiveStatus(String trainNumber) {
    return _cachedLiveStatus[trainNumber];
  }

  static List<TrainModel> getRecentTrains() {
    return _recentTrainNumbers
        .map((num) => _cachedTrains[num])
        .whereType<TrainModel>()
        .toList();
  }
}
