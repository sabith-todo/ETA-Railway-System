import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  History, Train, MapPin, Calendar, Clock, 
  ArrowRight, ShieldCheck, Leaf, Ticket, Plus, 
  Trash2, Download, Search, CheckCircle2, AlertTriangle, 
  Sparkles, Armchair, Navigation, Share2, X
} from "lucide-react";
import { fetchTravelHistory, recordTravelHistory, deleteTravelHistory } from "../services/api";

interface PassengerJourneyItem {
  id: string;
  train_number: string;
  train_name: string;
  train_type: string;
  from_station_code: string;
  from_station_name: string;
  to_station_code: string;
  to_station_name: string;
  journey_date: string;
  departure_time: string;
  arrival_time: string;
  distance_km: number;
  duration_str: string;
  coach: string;
  seat_number: string;
  berth_type: string;
  pnr?: string;
  status: string;
  punctuality: string;
  co2_saved_kg: number;
  notes?: string;
}

interface HistoryData {
  passenger_name: string;
  frequent_traveler_id: string;
  total_journeys: number;
  total_distance_km: number;
  total_co2_saved_kg: number;
  punctuality_rate_percent: number;
  most_frequented_corridor: string;
  journeys: PassengerJourneyItem[];
}

const LOCAL_STORAGE_KEY = "railway_passenger_history_local";

export const TravelHistoryPage: React.FC = () => {
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [journeys, setJourneys] = useState<PassengerJourneyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Completed" | "Upcoming">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Journey Form state
  const [newTrainNum, setNewTrainNum] = useState("12635");
  const [newTrainName, setNewTrainName] = useState("Vaigai Superfast Express");
  const [newTrainType, setNewTrainType] = useState("Superfast");
  const [newFromStn, setNewFromStn] = useState("Chennai Egmore (MS)");
  const [newToStn, setNewToStn] = useState("Madurai Jn (MDU)");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newCoach, setNewCoach] = useState("B2");
  const [newSeat, setNewSeat] = useState("42");
  const [newBerth, setNewBerth] = useState("Middle Berth (MB)");
  const [newPnr, setNewPnr] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchTravelHistory();
      // Check if local additions exist in localStorage
      const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
      let mergedJourneys = data.journeys || [];
      if (localSaved) {
        try {
          const parsedLocal: PassengerJourneyItem[] = JSON.parse(localSaved);
          // Merge by unique id
          const existingIds = new Set(mergedJourneys.map((j: any) => j.id));
          const additions = parsedLocal.filter((j) => !existingIds.has(j.id));
          mergedJourneys = [...additions, ...mergedJourneys];
        } catch {}
      }

      setJourneys(mergedJourneys);
      const totalKm = mergedJourneys.reduce((sum: number, j: any) => sum + (j.distance_km || 0), 0);
      const totalCo2 = mergedJourneys.reduce((sum: number, j: any) => sum + (j.co2_saved_kg || 0), 0);

      setHistoryData({
        ...data,
        total_journeys: mergedJourneys.length,
        total_distance_km: Math.round(totalKm),
        total_co2_saved_kg: Math.round(totalCo2),
        journeys: mergedJourneys,
      });
    } catch {
      // Fallback if backend offline
      setJourneys([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDeleteJourney = async (id: string) => {
    try {
      await deleteTravelHistory(id);
    } catch {}

    const updated = journeys.filter((j) => j.id !== id);
    setJourneys(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    showToast("Journey removed from travel diary.");
  };

  const handleAddJourney = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTrip: PassengerJourneyItem = {
      id: `trip_${Date.now()}`,
      train_number: newTrainNum.trim(),
      train_name: newTrainName.trim(),
      train_type: newTrainType,
      from_station_code: newFromStn.slice(0, 3).toUpperCase(),
      from_station_name: newFromStn,
      to_station_code: newToStn.slice(0, 3).toUpperCase(),
      to_station_name: newToStn,
      journey_date: newDate,
      departure_time: "14:00",
      arrival_time: "21:30",
      distance_km: 497.0,
      duration_str: "7h 30m",
      coach: newCoach.toUpperCase(),
      seat_number: newSeat,
      berth_type: newBerth,
      pnr: newPnr || `PNR${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      status: new Date(newDate) > new Date() ? "Upcoming" : "Completed",
      punctuality: "On Time",
      co2_saved_kg: 54.6,
      notes: newNotes,
    };

    try {
      await recordTravelHistory(newTrip);
    } catch {}

    const updated = [newTrip, ...journeys];
    setJourneys(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    setIsAddModalOpen(false);
    showToast(`Journey on ${newTrip.train_number} logged successfully!`);
  };

  const handleExportHistory = () => {
    const dataStr = JSON.stringify(journeys, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `passenger_rail_travel_history_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    showToast("Travel diary exported to JSON!");
  };

  // Filter journeys by search & status
  const filteredJourneys = journeys.filter((j) => {
    if (statusFilter !== "all" && j.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTrain = j.train_number.toLowerCase().includes(q) || j.train_name.toLowerCase().includes(q);
      const matchRoute = j.from_station_name.toLowerCase().includes(q) || j.to_station_name.toLowerCase().includes(q);
      const matchPnr = j.pnr && j.pnr.includes(q);
      return matchTrain || matchRoute || matchPnr;
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-railway-accent to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-railway-accent/25">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                  Passenger Travel History & Journey Diary
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                  Passenger Log
                </span>
              </div>
              <p className="text-xs text-railway-textSecondary mt-0.5">
                Lifetime journey records, boarding coaches, seat berths, and carbon footprint savings across Indian Railways
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-railway-accent hover:bg-railway-accentHover text-white font-bold text-xs shadow-md shadow-railway-accent/25 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Log a Journey
          </button>

          <button
            onClick={handleExportHistory}
            className="px-3 py-2 rounded-xl bg-railway-surface hover:bg-railway-hover border border-railway-border text-railway-textSecondary hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download JSON travel diary"
          >
            <Download className="w-3.5 h-3.5" />
            Export Diary
          </button>
        </div>
      </div>

      {/* Lifetime Travel Analytics Hero Card */}
      {historyData && (
        <div className="bg-gradient-to-r from-railway-dark via-railway-surface to-railway-card rounded-2xl border border-railway-border/80 p-5 sm:p-6 shadow-xl relative overflow-hidden space-y-4">
          
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-railway-border/50">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-railway-textMuted block">
                Frequent Rail Passenger Account
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                {historyData.passenger_name}
                <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded border border-emerald-500/30">
                  {historyData.frequent_traveler_id}
                </span>
              </h2>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-railway-textMuted block">
                Most Frequented Corridor
              </span>
              <span className="text-xs font-bold text-railway-accent">
                {historyData.most_frequented_corridor}
              </span>
            </div>
          </div>

          {/* 4 Stat Badges */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            
            <div className="p-3.5 rounded-xl bg-railway-darkest/70 border border-railway-border/60 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-railway-textMuted tracking-wider block">
                Total Rail Distance
              </span>
              <span className="font-mono text-2xl font-extrabold text-white block">
                {historyData.total_distance_km.toLocaleString()} km
              </span>
              <span className="text-[10px] text-railway-textSecondary block">
                Across Southern Railway
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-railway-darkest/70 border border-railway-border/60 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-railway-textMuted tracking-wider block">
                Completed Journeys
              </span>
              <span className="font-mono text-2xl font-extrabold text-white block">
                {historyData.total_journeys} Trips
              </span>
              <span className="text-[10px] text-railway-textSecondary block">
                Express, Superfast & Vande Bharat
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-railway-darkest/70 border border-railway-border/60 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-railway-textMuted tracking-wider block">
                On-Time Punctuality
              </span>
              <span className="font-mono text-2xl font-extrabold text-emerald-400 block flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                {historyData.punctuality_rate_percent}%
              </span>
              <span className="text-[10px] text-emerald-400/80 block">
                Within 15 mins of timetable
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block flex items-center gap-1">
                <Leaf className="w-3.5 h-3.5" /> CO2 Eco Savings
              </span>
              <span className="font-mono text-2xl font-extrabold text-emerald-400 block">
                ~{historyData.total_co2_saved_kg} kg
              </span>
              <span className="text-[10px] text-railway-textSecondary block">
                Saved compared to private road travel
              </span>
            </div>

          </div>

        </div>
      )}

      {/* Filter & Search Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-railway-surface/70 rounded-2xl border border-railway-border/60 p-3 sm:p-4">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-railway-darkest p-1 rounded-xl border border-railway-border">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "all" ? "bg-railway-accent text-white shadow-sm" : "text-railway-textMuted hover:text-white"
            }`}
          >
            All Trips ({journeys.length})
          </button>
          <button
            onClick={() => setStatusFilter("Completed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "Completed" ? "bg-railway-accent text-white shadow-sm" : "text-railway-textMuted hover:text-white"
            }`}
          >
            Completed ({journeys.filter((j) => j.status === "Completed").length})
          </button>
          <button
            onClick={() => setStatusFilter("Upcoming")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === "Upcoming" ? "bg-railway-accent text-white shadow-sm" : "text-railway-textMuted hover:text-white"
            }`}
          >
            Upcoming ({journeys.filter((j) => j.status === "Upcoming").length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-railway-textMuted absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search train, station, or PNR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-railway-darkest border border-railway-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-railway-textMuted focus:outline-none focus:border-railway-accent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-xs text-railway-textMuted hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="p-16 text-center text-railway-textSecondary space-y-2">
          <div className="w-8 h-8 border-2 border-railway-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Loading passenger travel history records...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredJourneys.length === 0 && (
        <div className="p-12 text-center text-railway-textMuted bg-railway-surface/40 rounded-2xl border border-railway-border/40 space-y-3">
          <History className="w-8 h-8 text-railway-accent mx-auto opacity-70" />
          <h3 className="font-bold text-white text-base">No Journeys Found</h3>
          <p className="text-xs text-railway-textSecondary max-w-md mx-auto">
            {searchQuery
              ? `No travel records match '${searchQuery}'. Try resetting your search filter.`
              : "You haven't logged any train trips yet. Click 'Log a Journey' to add your first rail adventure!"}
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-2 px-4 py-2 rounded-xl bg-railway-accent text-white font-bold text-xs"
          >
            + Log Your First Journey
          </button>
        </div>
      )}

      {/* Journey Cards Grid */}
      {!loading && filteredJourneys.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {filteredJourneys.map((journey) => {
            const isCompleted = journey.status === "Completed";
            const isOnTime = journey.punctuality.includes("On Time");

            return (
              <div
                key={journey.id}
                className="bg-railway-card/80 hover:bg-railway-card border border-railway-border/70 rounded-2xl p-5 shadow-lg transition-all hover:border-railway-accent/40 space-y-4"
              >
                
                {/* Card Top: Train & Date & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-railway-border/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-railway-darkest border border-railway-border flex items-center justify-center font-mono font-extrabold text-sm text-railway-accent">
                      {journey.train_number}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-base">
                          {journey.train_name}
                        </h3>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-railway-darkest text-railway-gold border border-railway-border">
                          {journey.train_type}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          isCompleted
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                        }`}>
                          {journey.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-railway-textMuted">
                        <span className="flex items-center gap-1 font-mono text-white">
                          <Calendar className="w-3 h-3 text-railway-accent" />
                          {journey.journey_date}
                        </span>
                        {journey.pnr && (
                          <span className="font-mono text-railway-textSecondary">
                            PNR: <strong className="text-white">{journey.pnr}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Punctuality Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono ${
                      isOnTime
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    }`}>
                      {journey.punctuality}
                    </span>

                    <button
                      onClick={() => handleDeleteJourney(journey.id)}
                      className="p-1.5 rounded-lg text-railway-textMuted hover:text-red-400 hover:bg-railway-surface transition-colors cursor-pointer"
                      title="Remove from history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Middle: Route Itinerary */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  
                  {/* Origin Station */}
                  <div className="sm:col-span-5 bg-railway-darkest/60 p-3 rounded-xl border border-railway-border/40">
                    <span className="text-[10px] uppercase font-bold text-railway-textMuted block">Boarded At:</span>
                    <span className="font-bold text-white text-sm block truncate">{journey.from_station_name}</span>
                    <span className="text-[11px] font-mono text-railway-textSecondary block mt-0.5">
                      Departed: <strong>{journey.departure_time}</strong>
                    </span>
                  </div>

                  {/* Distance & Arrow */}
                  <div className="sm:col-span-2 text-center py-1 sm:py-0">
                    <span className="font-mono text-xs font-bold text-railway-accent block">{journey.distance_km} km</span>
                    <span className="text-railway-accent block">➔</span>
                    <span className="text-[10px] text-railway-textMuted block">{journey.duration_str}</span>
                  </div>

                  {/* Destination Station */}
                  <div className="sm:col-span-5 bg-railway-darkest/60 p-3 rounded-xl border border-railway-border/40">
                    <span className="text-[10px] uppercase font-bold text-railway-textMuted block">Debarked At:</span>
                    <span className="font-bold text-white text-sm block truncate">{journey.to_station_name}</span>
                    <span className="text-[11px] font-mono text-railway-textSecondary block mt-0.5">
                      Arrived: <strong>{journey.arrival_time}</strong>
                    </span>
                  </div>

                </div>

                {/* Card Bottom: Coach & Seat Allotment & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-railway-border/40 text-xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-2.5 py-1 rounded-lg bg-railway-darkest text-railway-textSecondary border border-railway-border flex items-center gap-1.5 font-mono font-semibold">
                      <Armchair className="w-3.5 h-3.5 text-railway-accent" />
                      Coach <strong>{journey.coach}</strong> • Seat <strong>{journey.seat_number}</strong> ({journey.berth_type})
                    </span>

                    <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                      <Leaf className="w-3 h-3" />
                      Saved {journey.co2_saved_kg} kg CO2
                    </span>

                    {journey.notes && (
                      <span className="text-railway-textMuted text-[11px] italic truncate max-w-xs">
                        "{journey.notes}"
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/train/${journey.train_number}`}
                      className="px-3 py-1.5 rounded-xl bg-railway-surface hover:bg-railway-accent text-railway-textSecondary hover:text-white border border-railway-border hover:border-railway-accent font-semibold text-xs transition-colors flex items-center gap-1"
                    >
                      Track Train Live ➔
                    </Link>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Log a Journey Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-railway-card border border-railway-border/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            
            <div className="flex items-center justify-between pb-3 border-b border-railway-border/50">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-railway-accent" />
                <h3 className="font-bold text-lg text-white">Log a Train Journey</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-railway-textMuted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddJourney} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-railway-textMuted uppercase mb-1">Train Number</label>
                  <input
                    type="text"
                    value={newTrainNum}
                    onChange={(e) => setNewTrainNum(e.target.value)}
                    placeholder="e.g. 12635"
                    className="w-full bg-railway-darkest border border-railway-border rounded-xl px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-railway-textMuted uppercase mb-1">Train Name</label>
                  <input
                    type="text"
                    value={newTrainName}
                    onChange={(e) => setNewTrainName(e.target.value)}
                    placeholder="e.g. Vaigai Express"
                    className="w-full bg-railway-darkest border border-railway-border rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-railway-textMuted uppercase mb-1">From Station</label>
                  <input
                    type="text"
                    value={newFromStn}
                    onChange={(e) => setNewFromStn(e.target.value)}
                    placeholder="e.g. Chennai Egmore (MS)"
                    className="w-full bg-railway-darkest border border-railway-border rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-railway-textMuted uppercase mb-1">To Station</label>
                  <input
                    type="text"
                    value={newToStn}
                    onChange={(e) => setNewToStn(e.target.value)}
                    placeholder="e.g. Madurai Jn (MDU)"
                    className="w-full bg-railway-darkest border border-railway-border rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-railway-textMuted uppercase mb-1">Travel Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-railway-darkest border border-railway-border rounded-xl px-2.5 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-railway-textMuted uppercase mb-1">Coach</label>
                  <input
                    type="text"
                    value={newCoach}
                    onChange={(e) => setNewCoach(e.target.value)}
                    placeholder="e.g. B2, S1, C1"
                    className="w-full bg-railway-darkest border border-railway-border rounded-xl px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-railway-textMuted uppercase mb-1">Seat No.</label>
                  <input
                    type="text"
                    value={newSeat}
                    onChange={(e) => setNewSeat(e.target.value)}
                    placeholder="e.g. 42"
                    className="w-full bg-railway-darkest border border-railway-border rounded-xl px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-railway-textMuted uppercase mb-1">Berth / Seat Type</label>
                <select
                  value={newBerth}
                  onChange={(e) => setNewBerth(e.target.value)}
                  className="w-full bg-railway-darkest border border-railway-border rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Lower Berth (LB)">Lower Berth (LB)</option>
                  <option value="Middle Berth (MB)">Middle Berth (MB)</option>
                  <option value="Upper Berth (UB)">Upper Berth (UB)</option>
                  <option value="Side Lower (SL)">Side Lower (SL)</option>
                  <option value="Side Upper (SU)">Side Upper (SU)</option>
                  <option value="Window Seat (W)">Window Seat (W)</option>
                  <option value="Aisle Seat (A)">Aisle Seat (A)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-railway-textMuted uppercase mb-1">10-Digit PNR Number (Optional)</label>
                <input
                  type="text"
                  maxLength={10}
                  value={newPnr}
                  onChange={(e) => setNewPnr(e.target.value)}
                  placeholder="e.g. 4521890321"
                  className="w-full bg-railway-darkest border border-railway-border rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-railway-textMuted uppercase mb-1">Trip Notes & Memories (Optional)</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. On-time run, scenic sunset near Erode junction..."
                  className="w-full bg-railway-darkest border border-railway-border rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-railway-surface border border-railway-border text-xs text-railway-textSecondary hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-railway-accent hover:bg-railway-accentHover text-white font-bold text-xs shadow-md shadow-railway-accent/30"
                >
                  Save to Diary
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
