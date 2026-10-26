import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/train_provider.dart';
import '../../models/train.dart';
import '../../models/saved_train.dart';
import '../../core/theme/app_colors.dart';
import '../../core/utils/risk_evaluator.dart';
import '../../core/utils/date_formatter.dart';
import '../train_details/train_details_screen.dart';

class SavedScreen extends StatelessWidget {
  const SavedScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final trainProvider = Provider.of<TrainProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text("Saved Favourites"),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => trainProvider.loadSavedTrains(),
          ),
        ],
      ),
      body: trainProvider.isLoadingSaved
          ? const Center(child: CircularProgressIndicator())
          : trainProvider.savedTrains.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.favorite_border_rounded, size: 64, color: AppColors.neutralGrey.withOpacity(0.5)),
                        const SizedBox(height: 16),
                        const Text(
                          "No Favourite Trains",
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          "Tap the heart icon on any train card or details screen to save it for quick access.",
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.neutralGrey, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  itemCount: trainProvider.savedTrains.length,
                  itemBuilder: (context, index) {
                    final item = trainProvider.savedTrains[index];
                    return Dismissible(
                      key: Key("saved_${item.trainNumber}"),
                      direction: DismissDirection.endToStart,
                      background: Container(
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 20),
                        color: Colors.redAccent,
                        child: const Icon(Icons.delete_rounded, color: Colors.white),
                      ),
                      onDismissed: (_) {
                        trainProvider.toggleSaveTrain(TrainModel(
                          number: item.trainNumber,
                          name: item.name ?? "",
                          type: "Express",
                          origin: item.origin ?? "",
                          destination: item.destination ?? "",
                          departureTime: "",
                          arrivalTime: "",
                          currentStation: "",
                          nextStation: "",
                          currentSpeed: 0,
                          currentDelay: item.currentDelay,
                          status: item.status ?? "RUNNING",
                          scheduledEta: "",
                          aiPredictedEta: "",
                          difference: "",
                          riskLevel: "LOW",
                          riskReasons: const [],
                          dataSource: "SCHEDULED",
                        ));
                      },
                      child: Card(
                        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          leading: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              item.trainNumber,
                              style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.primary, fontSize: 14),
                            ),
                          ),
                          title: Text(
                            item.name ?? "Train ${item.trainNumber}",
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                          ),
                          subtitle: Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Row(
                              children: [
                                Text(
                                  "${item.origin} → ${item.destination}",
                                  style: const TextStyle(fontSize: 12, color: AppColors.neutralGrey),
                                ),
                                const Spacer(),
                                Text(
                                  DateFormatter.formatDelay(item.currentDelay),
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w700,
                                    color: RiskEvaluator.getDelayColor(item.currentDelay),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.neutralGrey),
                          onTap: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => TrainDetailsScreen(trainNumber: item.trainNumber),
                              ),
                            );
                          },
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
