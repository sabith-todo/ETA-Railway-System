import 'package:intl/intl.dart';

class DateFormatter {
  static String formatTime(String? timeStr) {
    if (timeStr == null || timeStr.isEmpty) return "--:--";
    try {
      final parts = timeStr.split(':');
      if (parts.length >= 2) {
        final h = int.parse(parts[0]);
        final m = int.parse(parts[1]);
        final dt = DateTime(2026, 1, 1, h, m);
        return DateFormat("HH:mm").format(dt);
      }
    } catch (_) {}
    return timeStr;
  }

  static String timeAgo(DateTime? dt) {
    if (dt == null) return "Unknown";
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) {
      return "${diff.inSeconds} seconds ago";
    } else if (diff.inMinutes < 60) {
      return "${diff.inMinutes} min ago";
    } else if (diff.inHours < 24) {
      return "${diff.inHours} hours ago";
    } else {
      return DateFormat("dd MMM, HH:mm").format(dt);
    }
  }

  static String formatDelay(double delayMinutes) {
    if (delayMinutes.abs() < 0.5) {
      return "On Time";
    } else if (delayMinutes > 0) {
      return "+${delayMinutes.round()} min";
    } else {
      return "${delayMinutes.round()} min";
    }
  }
}
