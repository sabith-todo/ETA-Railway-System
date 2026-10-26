import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/train.dart';
import '../../models/prediction.dart';
import '../../services/api_service.dart';
import '../../services/train_service.dart';
import '../../providers/train_provider.dart';
import '../../providers/tracking_provider.dart';
import '../../widgets/eta_card.dart';
import '../../widgets/risk_card.dart';
import '../../widgets/delay_chart.dart';
import '../../widgets/station_timeline.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/risk_evaluator.dart';
import '../../core/utils/date_formatter.dart';
import '../tracking/tracking_screen.dart';

class TrainDetailsScreen extends StatefulWidget {
  final String trainNumber;

  const TrainDetailsScreen({Key? key, required this.trainNumber}) : super(key: key);

  @override
  State<TrainDetailsScreen> createState() => _TrainDetailsScreenState();
}

class _TrainDetailsScreenState extends State<TrainDetailsScreen> {
  bool _isLoading = true;
  String? _error;
  TrainModel? _train;
  List<StationPrediction> _predictions = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final train = await ApiService.getTrainDetails(widget.trainNumber);
      TrainService.cacheTrain(train);

      final predData = await ApiService.getTrainPredictions(widget.trainNumber);
      List<StationPrediction> preds = [];
      if (predData["station_predictions"] is List) {
        preds = (predData["station_predictions"] as List)
            .map((e) => StationPrediction.fromJson(e))
            .toList();
      }

      setState(() {
        _train = train;
        _predictions = preds;
        _isLoading = false;
      });
    } catch (e) {
      // Offline fallback
      final cached = TrainService.getCachedTrain(widget.trainNumber);
      if (cached != null) {
        setState(() {
          _train = cached;
          _isLoading = false;
          _error = "Unable to retrieve live data. Showing cached telemetry.";
        });
      } else {
        setState(() {
          _error = "Unable to retrieve train details. Check network connection.";
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final trainProvider = Provider.of<TrainProvider>(context);
    final trackingProvider = Provider.of<TrackingProvider>(context, listen: false);

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _train != null ? "${_train!.number} ${_train!.name}" : "Train Details",
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
        ),
        actions: [
          if (_train != null)
            IconButton(
              icon: Icon(
                trainProvider.isTrainSaved(_train!.number)
                    ? Icons.favorite_rounded
                    : Icons.favorite_border_rounded,
                color: trainProvider.isTrainSaved(_train!.number) ? Colors.redAccent : null,
              ),
              onPressed: () => trainProvider.toggleSaveTrain(_train!),
            ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _train == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline_rounded, color: AppColors.severeDelay, size: 48),
                        const SizedBox(height: 16),
                        Text(_error ?? "Train not found", textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(onPressed: _loadData, child: const Text("Retry")),
                      ],
                    ),
                  ),
                )
              : SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (_error != null)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          color: AppColors.moderateDelay.withOpacity(0.2),
                          child: Row(
                            children: [
                              const Icon(Icons.warning_amber_rounded, color: AppColors.moderateDelay, size: 18),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _error!,
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ),

                      // Train Master Status Card
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkCard : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      _train!.number,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w900,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Text(
                                      _train!.name,
                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 14),

                              // Status, Speed, Delay Row
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  _buildInfoColumn("STATUS", _train!.status, RiskEvaluator.getDelayColor(_train!.currentDelay)),
                                  _buildInfoColumn("CURRENT SPEED", "${_train!.currentSpeed.round()} km/h", null),
                                  _buildInfoColumn("CURRENT DELAY", DateFormatter.formatDelay(_train!.currentDelay), RiskEvaluator.getDelayColor(_train!.currentDelay)),
                                  _buildInfoColumn("DATA SOURCE", _train!.dataSource, AppColors.primary),
                                ],
                              ),
                              const Divider(height: 24),

                              // Locations
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text("CURRENT STATION", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.neutralGrey)),
                                        const SizedBox(height: 2),
                                        Text(_train!.currentStation.isNotEmpty ? _train!.currentStation : _train!.origin, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                      ],
                                    ),
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Text("NEXT STATION", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.neutralGrey)),
                                        const SizedBox(height: 2),
                                        Text(_train!.nextStation.isNotEmpty ? _train!.nextStation : _train!.destination, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),

                              // Action: Open Live Tracking Map
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  icon: const Icon(Icons.map_rounded, size: 18),
                                  label: const Text("Track Live on Corridor Map"),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  onPressed: () {
                                    trackingProvider.selectTrain(_train!.number);
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (_) => TrackingScreen(initialTrainNumber: _train!.number),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // AI ETA CARD
                      EtaCard(
                        scheduledEta: _train!.scheduledEta,
                        aiPredictedEta: _train!.aiPredictedEta,
                        difference: _train!.difference,
                        delayMinutes: _train!.currentDelay,
                      ),

                      // OPERATIONAL RISK CARD
                      RiskCard(
                        riskLevel: _train!.riskLevel,
                        reasons: _train!.riskReasons,
                      ),

                      // DELAY PROPAGATION TRAJECTORY CHART
                      if (_predictions.isNotEmpty)
                        DelayChartWidget(predictions: _predictions),

                      // STATION TIMELINE SECTION
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                        child: Row(
                          children: [
                            const Icon(Icons.linear_scale_rounded, color: AppColors.primary, size: 20),
                            const SizedBox(width: 8),
                            const Text(
                              "STATION TIMELINE",
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                            ),
                            const Spacer(),
                            Text(
                              "${_predictions.length} Stops",
                              style: const TextStyle(fontSize: 12, color: AppColors.neutralGrey),
                            ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: StationTimeline(stations: _predictions),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
    );
  }

  Widget _buildInfoColumn(String label, String value, Color? color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: AppColors.neutralGrey, letterSpacing: 0.5),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: color ?? AppColors.primary,
          ),
        ),
      ],
    );
  }
}
