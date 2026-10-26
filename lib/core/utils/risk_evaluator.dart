import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class RiskEvaluator {
  static Color getRiskColor(String? level) {
    switch ((level ?? "").toUpperCase()) {
      case "HIGH":
        return AppColors.riskHigh;
      case "MEDIUM":
      case "MODERATE":
        return AppColors.riskMedium;
      case "LOW":
      default:
        return AppColors.riskLow;
    }
  }

  static IconData getRiskIcon(String? level) {
    switch ((level ?? "").toUpperCase()) {
      case "HIGH":
        return Icons.warning_rounded;
      case "MEDIUM":
      case "MODERATE":
        return Icons.info_outline_rounded;
      case "LOW":
      default:
        return Icons.check_circle_outline_rounded;
    }
  }

  static Color getDelayColor(double delayMinutes) {
    if (delayMinutes <= 5) {
      return AppColors.onTime;
    } else if (delayMinutes <= 20) {
      return AppColors.moderateDelay;
    } else {
      return AppColors.severeDelay;
    }
  }
}
