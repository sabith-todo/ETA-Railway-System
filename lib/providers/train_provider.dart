import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/train.dart';
import '../models/station.dart';
import '../models/saved_train.dart';
import '../services/api_service.dart';
import '../services/train_service.dart';

class TrainProvider extends ChangeNotifier {
  // Search State
  bool _isSearching = false;
  String _searchQuery = "";
  List<TrainModel> _searchResults = [];
  List<StationModel> _stationResults = [];
  String? _searchError;
  Timer? _debounceTimer;

  // Live Network State
  bool _isLoadingNetwork = false;
  Map<String, dynamic> _networkStats = {};
  String? _networkError;

  // Saved / Favourite State
  List<SavedTrainModel> _savedTrains = [];
  bool _isLoadingSaved = false;

  // Getters
  bool get isSearching => _isSearching;
  String get searchQuery => _searchQuery;
  List<TrainModel> get searchResults => _searchResults;
  List<StationModel> get stationResults => _stationResults;
  String? get searchError => _searchError;

  bool get isLoadingNetwork => _isLoadingNetwork;
  Map<String, dynamic> get networkStats => _networkStats;
  String? get networkError => _networkError;

  List<SavedTrainModel> get savedTrains => _savedTrains;
  bool get isLoadingSaved => _isLoadingSaved;
  List<TrainModel> get recentTrains => TrainService.getRecentTrains();

  TrainProvider() {
    loadNetworkStats();
    loadSavedTrains();
  }

  void onSearchChanged(String query) {
    _searchQuery = query;
    _debounceTimer?.cancel();
    if (query.trim().isEmpty) {
      _searchResults = [];
      _stationResults = [];
      _isSearching = false;
      _searchError = null;
      notifyListeners();
      return;
    }

    _isSearching = true;
    _searchError = null;
    notifyListeners();

    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      executeSearch(query.trim());
    });
  }

  Future<void> executeSearch(String query) async {
    _isSearching = true;
    _searchError = null;
    notifyListeners();

    try {
      final trains = await ApiService.searchTrains(query);
      final stations = await ApiService.searchStations(query);
      _searchResults = trains;
      _stationResults = stations;
      _isSearching = false;
      notifyListeners();
    } catch (e) {
      _isSearching = false;
      _searchError = e.toString().replaceAll("Exception: ", "");
      notifyListeners();
    }
  }

  Future<void> loadNetworkStats() async {
    _isLoadingNetwork = true;
    _networkError = null;
    notifyListeners();

    try {
      final stats = await ApiService.getLiveNetworkStats();
      _networkStats = stats;
      _isLoadingNetwork = false;
      notifyListeners();
    } catch (e) {
      _isLoadingNetwork = false;
      _networkError = "Live network data unavailable";
      notifyListeners();
    }
  }

  Future<void> loadSavedTrains() async {
    _isLoadingSaved = true;
    notifyListeners();

    try {
      final saved = await ApiService.getSavedTrains();
      _savedTrains = saved;
      _isLoadingSaved = false;
      notifyListeners();
    } catch (_) {
      _isLoadingSaved = false;
      notifyListeners();
    }
  }

  bool isTrainSaved(String trainNumber) {
    return _savedTrains.any((t) => t.trainNumber == trainNumber);
  }

  Future<void> toggleSaveTrain(TrainModel train) async {
    final alreadySaved = isTrainSaved(train.number);
    if (alreadySaved) {
      _savedTrains.removeWhere((t) => t.trainNumber == train.number);
      notifyListeners();
      try {
        await ApiService.removeSavedTrain(train.number);
      } catch (_) {}
    } else {
      _savedTrains.add(SavedTrainModel(
        trainNumber: train.number,
        name: train.name,
        origin: train.origin,
        destination: train.destination,
        currentDelay: train.currentDelay,
      ));
      notifyListeners();
      try {
        await ApiService.saveTrain(train.number, customLabel: train.name);
      } catch (_) {}
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    super.dispose();
  }
}
