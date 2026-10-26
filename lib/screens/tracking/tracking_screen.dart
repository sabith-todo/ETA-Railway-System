import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/tracking_provider.dart';
import '../../providers/prediction_provider.dart';
import '../../widgets/live_map.dart';
import '../../widgets/eta_card.dart';
import '../../widgets/station_timeline.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/risk_evaluator.dart';
import '../../core/utils/date_formatter.dart';

class TrackingScreen extends StatefulWidget {
  final String? initialTrainNumber;

  const TrackingScreen({Key? key, this.initialTrainNumber}) : super(key: key);

  @override
  State<TrackingScreen> createState() => _TrackingScreenState();
}

class _TrackingScreenState extends State<TrackingScreen> {
  final TextEditingController _trainInputController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final tracking = Provider.of<TrackingProvider>(context, listen: false);
      final pred = Provider.of<PredictionProvider>(context, listen: false);

      final target = widget.initialTrainNumber ?? tracking.activeTrainNumber ?? "12635";
      _trainInputController.text = target;
      tracking.selectTrain(target);
      pred.loadPredictions(target);
    });
  }

  @override
  void dispose() {
    _trainInputController.dispose();
    super.dispose();
  }

  void _onTrainSubmit() {
    final num = _trainInputController.text.trim();
    if (num.isNotEmpty) {
      final tracking = Provider.of<TrackingProvider>(context, listen: false);
      final pred = Provider.of<PredictionProvider>(context, listen: false);
      tracking.selectTrain(num);
      pred.loadPredictions(num);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tracking = Provider.of<TrackingProvider>(context);
    final pred = Provider.of<PredictionProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final train = tracking.activeTrain;
    final live = tracking.liveStatus;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Live Corridor Tracking"),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkCard : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                      ),
                    ),
                    child: TextField(
                      controller: _trainInputController,
                      decoration: const InputDecoration(
                        hintText: "Enter train number (e.g. 12635)...",
                        hintStyle: TextStyle(fontSize: 13, color: AppColors.neutralGrey),
                        prefixIcon: Icon(Icons.directions_train_rounded, size: 20, color: AppColors.primary),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(vertical: 12),
                      ),
                      onSubmitted: (_) => _onTrainSubmit(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                  onPressed: _onTrainSubmit,
                  child: const Text("Track"),
                ),
              ],
            ),
          ),
        ),
      ),
      body: tracking.isLoading && train == null
          ? const Center(child: CircularProgressIndicator())
          : train == null
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      "Search or enter a train number above to track on the geographical railway map.",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: AppColors.neutralGrey),
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () async {
                    if (tracking.activeTrainNumber != null) {
                      await tracking.fetchTrackingData(tracking.activeTrainNumber!);
                      await pred.loadPredictions(tracking.activeTrainNumber!);
                    }
                  },
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Live Telemetry Freshness Bar
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          color: (live != null && live.isLive)
                              ? AppColors.onTime.withOpacity(0.12)
                              : (live != null && live.isLastKnown)
                                  ? AppColors.moderateDelay.withOpacity(0.12)
                                  : AppColors.neutralGrey.withOpacity(0.1),
                          child: Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: (live != null && live.isLive)
                                      ? AppColors.onTime
                                      : (live != null && live.isLastKnown)
                                          ? AppColors.moderateDelay
                                          : AppColors.neutralGrey,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                (live != null && live.isLive)
                                    ? "LIVE ● Updated ${tracking.secondsSinceUpdate} seconds ago"
                                    : (live != null && live.isLastKnown)
                                        ? "LAST KNOWN ● Cached ${tracking.secondsSinceUpdate}s ago"
                                        : "SCHEDULED ● Live data unavailable",
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: (live != null && live.isLive)
                                      ? AppColors.onTime
                                      : (live != null && live.isLastKnown)
                                          ? AppColors.moderateDelay
                                          : AppColors.neutralGrey,
                                ),
                              ),
                              const Spacer(),
                              Text(
                                "Speed: ${(live?.speed ?? train.currentSpeed).round()} km/h",
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),

                        // Centerpiece Map Container
                        SizedBox(
                          height: 380,
                          child: LiveMapWidget(
                            train: train,
                            liveStatus: live,
                            routeGeoJson: tracking.routeGeoJson,
                          ),
                        ),

                        // Dynamic ETA Card
                        EtaCard(
                          scheduledEta: train.scheduledEta,
                          aiPredictedEta: train.aiPredictedEta,
                          difference: train.difference,
                          delayMinutes: live?.delay ?? train.currentDelay,
                        ),

                        // Station Timeline Header
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          child: Row(
                            children: [
                              const Icon(Icons.timeline_rounded, color: AppColors.primary, size: 20),
                              const SizedBox(width: 8),
                              const Text(
                                "STATION TIMELINE",
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                              ),
                              const Spacer(),
                              Text(
                                "${pred.predictions.length} Stations",
                                style: const TextStyle(fontSize: 12, color: AppColors.neutralGrey),
                              ),
                            ],
                          ),
                        ),

                        // Station Timeline List
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: StationTimeline(stations: pred.predictions),
                        ),

                        const SizedBox(height: 32),
                      ],
                    ),
                  ),
                ),
    );
  }
}
