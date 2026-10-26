import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import '../core/utils/risk_evaluator.dart';

class RiskCard extends StatelessWidget {
  final String riskLevel;
  final List<String> reasons;

  const RiskCard({
    Key? key,
    required this.riskLevel,
    required this.reasons,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final riskColor = RiskEvaluator.getRiskColor(riskLevel);
    final riskIcon = RiskEvaluator.getRiskIcon(riskLevel);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(riskIcon, color: riskColor, size: 20),
                const SizedBox(width: 8),
                const Text(
                  "Operational Risk Indicator",
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: riskColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    riskLevel.toUpperCase(),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: riskColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (reasons.isNotEmpty) ...[
              const Text(
                "Risk Factors & Telemetry Signals:",
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.neutralGrey),
              ),
              const SizedBox(height: 8),
              ...reasons.map((r) => Padding(
                padding: const EdgeInsets.only(bottom: 5),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(top: 5),
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: riskColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        r,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              )),
            ] else ...[
              const Text(
                "No severe operational risk factors detected. Standard corridor conditions.",
                style: TextStyle(fontSize: 13, color: AppColors.neutralGrey),
              ),
            ],
            const SizedBox(height: 10),
            Text(
              "Operational risk is derived from telemetry velocity, historical latency, and delay momentum. Not an official IR classification.",
              style: TextStyle(
                fontSize: 10,
                fontStyle: FontStyle.italic,
                color: isDark ? AppColors.darkTextSecondary.withOpacity(0.7) : AppColors.lightTextSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
