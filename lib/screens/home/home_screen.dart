import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/train_provider.dart';
import '../../providers/tracking_provider.dart';
import '../../models/train.dart';
import '../../widgets/train_card.dart';
import '../../core/theme/app_colors.dart';
import '../train_details/train_details_screen.dart';

class HomeScreen extends StatefulWidget {
  final Function(int) onTabChange;

  const HomeScreen({Key? key, required this.onTabChange}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _searchController = TextEditingController();
  bool _searchStationMode = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openTrainDetails(BuildContext context, String trainNumber) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TrainDetailsScreen(trainNumber: trainNumber),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final trainProvider = Provider.of<TrainProvider>(context);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.train_rounded, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Text(
              "RailForecastAI",
              style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.5),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: "Refresh Live Network",
            onPressed: () {
              trainProvider.loadNetworkStats();
              trainProvider.loadSavedTrains();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await trainProvider.loadNetworkStats();
          await trainProvider.loadSavedTrains();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Search Header Card
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Container(
                  decoration: BoxDecoration(
                    color: isDark ? AppColors.darkCard : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
                    ),
                  ),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (val) => trainProvider.onSearchChanged(val),
                    decoration: InputDecoration(
                      hintText: _searchStationMode
                          ? "Search station code or city..."
                          : "Search train number or train name...",
                      hintStyle: const TextStyle(fontSize: 14, color: AppColors.neutralGrey),
                      prefixIcon: const Icon(Icons.search_rounded, color: AppColors.primary),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear_rounded, size: 18),
                              onPressed: () {
                                _searchController.clear();
                                trainProvider.onSearchChanged("");
                              },
                            )
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              ),

              // Quick Action Mode Buttons [Track Train] [Search Station]
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.gps_fixed_rounded, size: 16),
                        label: const Text("Track Train"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: !_searchStationMode ? AppColors.primary : (isDark ? AppColors.darkCard : Colors.white),
                          foregroundColor: !_searchStationMode ? Colors.white : (isDark ? Colors.white : AppColors.lightTextPrimary),
                          elevation: 0,
                          side: BorderSide(
                            color: !_searchStationMode ? AppColors.primary : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          ),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () {
                          setState(() => _searchStationMode = false);
                          if (_searchController.text.isNotEmpty) {
                            trainProvider.onSearchChanged(_searchController.text);
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.apartment_rounded, size: 16),
                        label: const Text("Search Station"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _searchStationMode ? AppColors.primary : (isDark ? AppColors.darkCard : Colors.white),
                          foregroundColor: _searchStationMode ? Colors.white : (isDark ? Colors.white : AppColors.lightTextPrimary),
                          elevation: 0,
                          side: BorderSide(
                            color: _searchStationMode ? AppColors.primary : (isDark ? AppColors.darkBorder : AppColors.lightBorder),
                          ),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () {
                          setState(() => _searchStationMode = true);
                          if (_searchController.text.isNotEmpty) {
                            trainProvider.onSearchChanged(_searchController.text);
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Search Results (if user entered text)
              if (_searchController.text.isNotEmpty) ...[
                if (trainProvider.isSearching)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(24),
                      child: CircularProgressIndicator(),
                    ),
                  )
                else if (trainProvider.searchError != null)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Center(
                      child: Text(
                        trainProvider.searchError!,
                        style: const TextStyle(color: AppColors.severeDelay),
                      ),
                    ),
                  )
                else if (!_searchStationMode) ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Text(
                      "TRAIN SEARCH RESULTS (${trainProvider.searchResults.length})",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.neutralGrey),
                    ),
                  ),
                  if (trainProvider.searchResults.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                        child: Text("No trains matched your search query."),
                      ),
                    )
                  else
                    ...trainProvider.searchResults.map((train) => TrainCard(
                          train: train,
                          onTap: () => _openTrainDetails(context, train.number),
                        )),
                ] else ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Text(
                      "STATION SEARCH RESULTS (${trainProvider.stationResults.length})",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.neutralGrey),
                    ),
                  ),
                  if (trainProvider.stationResults.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(
                        child: Text("No stations matched your search query."),
                      ),
                    )
                  else
                    ...trainProvider.stationResults.map((st) => Card(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: AppColors.primary.withOpacity(0.12),
                              child: Text(
                                st.code,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: AppColors.primary),
                              ),
                            ),
                            title: Text(st.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                            subtitle: Text("${st.city}, ${st.state} • ${st.zone} Zone"),
                            trailing: Text("${st.platforms} Platforms", style: const TextStyle(fontSize: 12, color: AppColors.neutralGrey)),
                          ),
                        )),
                ],
                const SizedBox(height: 20),
              ],

              // LIVE NETWORK SECTION
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    const Icon(Icons.sensors_rounded, color: AppColors.primary, size: 18),
                    const SizedBox(width: 8),
                    const Text(
                      "LIVE NETWORK",
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                    ),
                    const Spacer(),
                    if (trainProvider.networkStats["available"] == true)
                      const Text(
                        "LIVE ●",
                        style: TextStyle(color: AppColors.onTime, fontSize: 11, fontWeight: FontWeight.w800),
                      ),
                  ],
                ),
              ),

              if (trainProvider.isLoadingNetwork)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (trainProvider.networkStats["available"] != true)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkCard : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.cloud_off_rounded, color: AppColors.neutralGrey, size: 20),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            "Live network data unavailable",
                            style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.neutralGrey),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      _buildNetworkStatCard("Running", "${trainProvider.networkStats['trains_running'] ?? 0}", AppColors.primary, isDark),
                      const SizedBox(width: 8),
                      _buildNetworkStatCard("On Time", "${trainProvider.networkStats['on_time'] ?? 0}", AppColors.onTime, isDark),
                      const SizedBox(width: 8),
                      _buildNetworkStatCard("Delayed", "${trainProvider.networkStats['delayed'] ?? 0}", AppColors.moderateDelay, isDark),
                      const SizedBox(width: 8),
                      _buildNetworkStatCard("High Risk", "${trainProvider.networkStats['high_risk'] ?? 0}", AppColors.severeDelay, isDark),
                    ],
                  ),
                ),

              const SizedBox(height: 20),

              // FAVOURITES SECTION
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    const Icon(Icons.favorite_rounded, color: Colors.redAccent, size: 18),
                    const SizedBox(width: 8),
                    const Text(
                      "FAVOURITES",
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                    ),
                    const Spacer(),
                    TextButton(
                      child: const Text("View All", style: TextStyle(fontSize: 12)),
                      onPressed: () => widget.onTabChange(2), // Switch to SAVED tab
                    ),
                  ],
                ),
              ),

              if (trainProvider.savedTrains.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkCard : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                    ),
                    child: const Text(
                      "No favourite trains saved yet. Tap the heart icon on any train to save it here for fast tracking.",
                      style: TextStyle(fontSize: 13, color: AppColors.neutralGrey),
                    ),
                  ),
                )
              else
                ...trainProvider.savedTrains.take(3).map((saved) => ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                      leading: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          saved.trainNumber,
                          style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary),
                        ),
                      ),
                      title: Text(saved.name ?? "Train ${saved.trainNumber}", style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Text("${saved.origin} → ${saved.destination}"),
                      trailing: const Icon(Icons.chevron_right_rounded),
                      onTap: () => _openTrainDetails(context, saved.trainNumber),
                    )),

              const SizedBox(height: 20),

              // RECENT TRAINS SECTION
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  children: [
                    const Icon(Icons.history_rounded, color: AppColors.neutralGrey, size: 18),
                    const SizedBox(width: 8),
                    const Text(
                      "RECENT TRAINS",
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                    ),
                  ],
                ),
              ),

              if (trainProvider.recentTrains.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkCard : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
                    ),
                    child: const Text(
                      "No recently tracked trains. Search any train above to track live status.",
                      style: TextStyle(fontSize: 13, color: AppColors.neutralGrey),
                    ),
                  ),
                )
              else
                ...trainProvider.recentTrains.map((t) => TrainCard(
                      train: t,
                      onTap: () => _openTrainDetails(context, t.number),
                    )),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNetworkStatCard(String label, String value, Color color, bool isDark) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkCard : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isDark ? AppColors.darkBorder : AppColors.lightBorder),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
