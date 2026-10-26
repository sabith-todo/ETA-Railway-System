import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../models/train.dart';
import '../models/live_status.dart';
import '../core/theme/app_colors.dart';
import '../core/utils/risk_evaluator.dart';
import '../core/utils/date_formatter.dart';

class LiveMapWidget extends StatefulWidget {
  final TrainModel train;
  final LiveStatusModel? liveStatus;
  final Map<String, dynamic>? routeGeoJson;

  const LiveMapWidget({
    Key? key,
    required this.train,
    this.liveStatus,
    this.routeGeoJson,
  }) : super(key: key);

  @override
  State<LiveMapWidget> createState() => _LiveMapWidgetState();
}

class _LiveMapWidgetState extends State<LiveMapWidget> {
  final MapController _mapController = MapController();

  List<LatLng> _completedTrack = [];
  List<LatLng> _remainingTrack = [];
  List<Map<String, dynamic>> _stationPoints = [];
  LatLng? _currentTrainPosition;

  @override
  void initState() {
    super.initState();
    _parseGeoJson();
  }

  @override
  void didUpdateWidget(covariant LiveMapWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.routeGeoJson != widget.routeGeoJson ||
        oldWidget.liveStatus != widget.liveStatus) {
      _parseGeoJson();
    }
  }

  void _parseGeoJson() {
    _completedTrack = [];
    _remainingTrack = [];
    _stationPoints = [];

    // Parse Train Current Position
    final lat = widget.liveStatus?.latitude ?? widget.train.currentLat;
    final lon = widget.liveStatus?.longitude ?? widget.train.currentLon;
    if (lat != null && lon != null && lat != 0.0 && lon != 0.0) {
      _currentTrainPosition = LatLng(lat, lon);
    } else {
      _currentTrainPosition = null;
    }

    final geo = widget.routeGeoJson;
    if (geo == null || geo["features"] is! List) return;

    for (var f in (geo["features"] as List)) {
      if (f is! Map) continue;
      final geom = f["geometry"];
      final props = f["properties"] ?? {};
      if (geom is! Map) continue;

      final type = geom["type"];
      final coords = geom["coordinates"];

      if (type == "LineString" && coords is List) {
        final pts = coords.map((c) {
          if (c is List && c.length >= 2) {
            return LatLng((c[1] as num).toDouble(), (c[0] as num).toDouble());
          }
          return null;
        }).whereType<LatLng>().toList();

        final seg = props["segment"] ?? "";
        if (seg == "completed") {
          _completedTrack.addAll(pts);
        } else {
          _remainingTrack.addAll(pts);
        }
      } else if (type == "Point" && coords is List && coords.length >= 2) {
        final pt = LatLng((coords[1] as num).toDouble(), (coords[0] as num).toDouble());
        _stationPoints.add({
          "latlng": pt,
          "station_code": props["station_code"] ?? "",
          "station_name": props["station_name"] ?? props["station_code"] ?? "",
          "scheduled_arrival": props["scheduled_arrival"] ?? "--:--",
          "predicted_arrival": props["predicted_arrival"] ?? "--:--",
          "delay_minutes": (props["delay_minutes"] ?? 0.0).toDouble(),
          "passed": props["passed"] ?? false,
        });
      }
    }
  }

  void _showStationDetails(Map<String, dynamic> st) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.apartment_rounded, color: AppColors.primary, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          st["station_name"],
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                        ),
                        Text(
                          "Station Code: ${st["station_code"]}",
                          style: const TextStyle(color: AppColors.neutralGrey, fontSize: 13),
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Scheduled Arrival", style: TextStyle(fontSize: 12, color: AppColors.neutralGrey)),
                        Text(st["scheduled_arrival"], style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Predicted Arrival", style: TextStyle(fontSize: 12, color: AppColors.neutralGrey)),
                        Text(
                          st["predicted_arrival"] != "--:--" ? st["predicted_arrival"] : st["scheduled_arrival"],
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.primary),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Delay", style: TextStyle(fontSize: 12, color: AppColors.neutralGrey)),
                        Text(
                          DateFormatter.formatDelay(st["delay_minutes"]),
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: RiskEvaluator.getDelayColor(st["delay_minutes"]),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    // Initial center: train location or first station coordinate or Mas (13.08, 80.27)
    final initialCenter = _currentTrainPosition ??
        (_stationPoints.isNotEmpty ? _stationPoints.first["latlng"] as LatLng : const LatLng(13.0827, 80.2707));

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: initialCenter,
            initialZoom: 8.0,
            maxZoom: 18.0,
            minZoom: 4.0,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.railforecastai.app',
            ),
            // Polyline Layers (Completed track vs Remaining track)
            PolylineLayer(
              polylines: [
                if (_completedTrack.isNotEmpty)
                  Polyline(
                    points: _completedTrack,
                    strokeWidth: 4.0,
                    color: AppColors.completedTrack,
                    pattern: const StrokePattern.dashed(segments: [6, 4]),
                  ),
                if (_remainingTrack.isNotEmpty)
                  Polyline(
                    points: _remainingTrack,
                    strokeWidth: 5.0,
                    color: AppColors.remainingTrack,
                  ),
              ],
            ),
            // Station Markers Layer
            MarkerLayer(
              markers: _stationPoints.map((st) {
                final LatLng pt = st["latlng"];
                final bool passed = st["passed"] ?? false;
                return Marker(
                  point: pt,
                  width: 28,
                  height: 28,
                  child: GestureDetector(
                    onTap: () => _showStationDetails(st),
                    child: Container(
                      decoration: BoxDecoration(
                        color: passed ? AppColors.neutralGrey : AppColors.primary,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 2),
                        boxShadow: const [
                          BoxShadow(color: Colors.black26, blurRadius: 4, offset: Offset(0, 2)),
                        ],
                      ),
                      child: const Icon(Icons.circle, color: Colors.white, size: 8),
                    ),
                  ),
                );
              }).toList(),
            ),
            // Live Train Marker Layer
            if (_currentTrainPosition != null)
              MarkerLayer(
                markers: [
                  Marker(
                    point: _currentTrainPosition!,
                    width: 44,
                    height: 44,
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppColors.trainMarker,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                        boxShadow: const [
                          BoxShadow(color: Colors.black45, blurRadius: 8, offset: Offset(0, 3)),
                        ],
                      ),
                      child: const Icon(
                        Icons.train_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ),

        // Live Position Unavailable Notice overlay
        if (_currentTrainPosition == null)
          Positioned(
            top: 16,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.black87,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.amber, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Live train position unavailable. Displaying scheduled corridor tracks.",
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ),

        // Recenter Button
        Positioned(
          bottom: 16,
          right: 16,
          child: FloatingActionButton.small(
            backgroundColor: Colors.white,
            foregroundColor: AppColors.primary,
            child: const Icon(Icons.my_location_rounded),
            onPressed: () {
              if (_currentTrainPosition != null) {
                _mapController.move(_currentTrainPosition!, 10.0);
              } else if (_stationPoints.isNotEmpty) {
                _mapController.move(_stationPoints.first["latlng"], 8.0);
              }
            },
          ),
        ),
      ],
    );
  }
}
