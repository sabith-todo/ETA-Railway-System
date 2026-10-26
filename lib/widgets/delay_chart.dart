import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../models/prediction.dart';
import '../core/theme/app_colors.dart';

class DelayChartWidget extends StatelessWidget {
  final List<StationPrediction> predictions;

  const DelayChartWidget({
    Key? key,
    required this.predictions,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (predictions.isEmpty) {
      return const SizedBox.shrink();
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final spots = <FlSpot>[];
    double maxDelay = 10.0;

    for (int i = 0; i < predictions.length; i++) {
      final d = predictions[i].delayMinutes;
      spots.add(FlSpot(i.toDouble(), d));
      if (d > maxDelay) maxDelay = d;
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.show_chart_rounded, color: AppColors.primary, size: 20),
                const SizedBox(width: 8),
                const Text(
                  "Delay Propagation Trajectory",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                ),
                const Spacer(),
                Text(
                  "${predictions.length} Stations Ahead",
                  style: const TextStyle(fontSize: 12, color: AppColors.neutralGrey),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 160,
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(
                    show: true,
                    drawVerticalLine: false,
                    getDrawingHorizontalLine: (val) => FlLine(
                      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                      strokeWidth: 1,
                    ),
                  ),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 32,
                        getTitlesWidget: (value, meta) {
                          return Text(
                            "${value.toInt()}m",
                            style: const TextStyle(fontSize: 10, color: AppColors.neutralGrey),
                          );
                        },
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 24,
                        getTitlesWidget: (value, meta) {
                          final idx = value.toInt();
                          if (idx >= 0 && idx < predictions.length && idx % 2 == 0) {
                            return Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                predictions[idx].stationCode,
                                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.neutralGrey),
                              ),
                            );
                          }
                          return const SizedBox.shrink();
                        },
                      ),
                    ),
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  minY: 0,
                  maxY: maxDelay + 5,
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      color: AppColors.primary,
                      barWidth: 3.5,
                      isStrokeCapRound: true,
                      dotData: FlDotData(
                        show: true,
                        getDotPainter: (spot, percent, barData, index) {
                          return FlDotCirclePainter(
                            radius: 3.5,
                            color: AppColors.primary,
                            strokeWidth: 1.5,
                            strokeColor: Colors.white,
                          );
                        },
                      ),
                      belowBarData: BarAreaData(
                        show: true,
                        color: AppColors.primary.withOpacity(0.12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
