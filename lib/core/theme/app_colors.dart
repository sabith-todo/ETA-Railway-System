import 'package:flutter/material.dart';

class AppColors {
  // Primary Palette
  static const Color primary = Color(0xFF0284C7);
  static const Color primaryDark = Color(0xFF0369A1);
  static const Color secondary = Color(0xFF0F172A);
  static const Color accent = Color(0xFF38BDF8);

  // Railway Status Colors
  static const Color onTime = Color(0xFF10B981);       // Emerald green
  static const Color moderateDelay = Color(0xFFF59E0B); // Warm amber
  static const Color severeDelay = Color(0xFFEF4444);   // Alert crimson
  static const Color neutralGrey = Color(0xFF64748B);

  // Operational Risk Badges
  static const Color riskLow = Color(0xFF10B981);
  static const Color riskMedium = Color(0xFFF59E0B);
  static const Color riskHigh = Color(0xFFEF4444);

  // Light Theme Surfaces
  static const Color lightBg = Color(0xFFF8FAFC);
  static const Color lightCard = Colors.white;
  static const Color lightTextPrimary = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF64748B);
  static const Color lightBorder = Color(0xFFE2E8F0);

  // Dark Theme Surfaces
  static const Color darkBg = Color(0xFF090D16);
  static const Color darkCard = Color(0xFF131C2E);
  static const Color darkCardElevated = Color(0xFF1E293B);
  static const Color darkTextPrimary = Color(0xFFF8FAFC);
  static const Color darkTextSecondary = Color(0xFF94A3B8);
  static const Color darkBorder = Color(0xFF1E293B);

  // Map Polyline Colors
  static const Color completedTrack = Color(0xFF64748B);
  static const Color remainingTrack = Color(0xFF0284C7);
  static const Color trainMarker = Color(0xFFF43F5E);
}
