import 'package:flutter/material.dart';
import '../models/prediction.dart';
import '../core/theme/app_colors.dart';
import '../core/utils/risk_evaluator.dart';
import '../core/utils/date_formatter.dart';

class StationTimeline extends StatelessWidget {
  final List<StationPrediction> stations;

  const StationTimeline({
    Key? key,
    required this.stations,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (stations.isEmpty) {
      return const Padding(
        padding: EdgeInsets.all(24),
        child: Center(
          child: Text(
            "Timetable stations unavailable",
            style: TextStyle(color: AppColors.neutralGrey),
          ),
        ),
      );
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: stations.length,
      itemBuilder: (context, index) {
        final st = stations[index];
        final isPassed = st.status == "PASSED";
        final isCurrent = st.status == "CURRENT";
        final isUpcoming = st.status == "UPCOMING";
        final isLast = index == stations.length - 1;

        Color nodeColor = AppColors.neutralGrey;
        Widget nodeIcon;

        if (isPassed) {
          nodeColor = AppColors.onTime;
          nodeIcon = const Icon(Icons.check, size: 14, color: Colors.white);
        } else if (isCurrent) {
          nodeColor = AppColors.primary;
          nodeIcon = Container(
            width: 10,
            height: 10,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
          );
        } else {
          nodeColor = isDark ? AppColors.darkBorder : AppColors.lightBorder;
          nodeIcon = Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.neutralGrey, width: 2),
            ),
          );
        }

        return IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Timeline Column (Node + Connecting Line)
              SizedBox(
                width: 40,
                child: Column(
                  children: [
                    Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        color: isPassed
                            ? AppColors.onTime
                            : (isCurrent ? AppColors.primary : Colors.transparent),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isPassed
                              ? AppColors.onTime
                              : (isCurrent ? AppColors.primary : AppColors.neutralGrey),
                          width: 2,
                        ),
                      ),
                      child: Center(child: nodeIcon),
                    ),
                    if (!isLast)
                      Expanded(
                        child: Container(
                          width: 2,
                          color: isPassed ? AppColors.onTime : AppColors.neutralGrey.withOpacity(0.3),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Station Information Card / Row
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(bottom: isLast ? 0 : 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            st.stationName,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: isCurrent ? FontWeight.w800 : FontWeight.w700,
                              color: isCurrent
                                  ? AppColors.primary
                                  : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            "(${st.stationCode})",
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.neutralGrey,
                            ),
                          ),
                          if (isCurrent)
                            Container(
                              margin: const EdgeInsets.only(left: 8),
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                "CURRENT",
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // Time and Delay Breakdown
                      Row(
                        children: [
                          if (isPassed) ...[
                            Text(
                              "Scheduled: ${st.scheduledArrival}",
                              style: const TextStyle(fontSize: 12, color: AppColors.neutralGrey),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              "Actual: ${st.predictedArrival}",
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                              ),
                            ),
                          ] else ...[
                            Text(
                              "Scheduled: ${st.scheduledArrival}",
                              style: const TextStyle(fontSize: 12, color: AppColors.neutralGrey),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              "Predicted: ${st.predictedArrival}",
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                          const Spacer(),
                          // Delay delta pill
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: RiskEvaluator.getDelayColor(st.delayMinutes).withOpacity(0.15),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              DateFormatter.formatDelay(st.delayMinutes),
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: RiskEvaluator.getDelayColor(st.delayMinutes),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
