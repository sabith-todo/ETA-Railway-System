import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Building2, Clock, MapPin, Search, ArrowRight, 
  Radio, Train, ShieldCheck, AlertTriangle, ArrowUpDown, Filter
} from "lucide-react";
import { fetchStationLiveBoard, fetchStations } from "../services/api";
import { StationAutocomplete } from "./StationAutocomplete";

interface LiveBoardTrain {
  train_number: string;
  train_name: string;
  train_type: string;
  origin_code: string;
  origin_name: string;
  destination_code: string;
  destination_name: string;
  scheduled_arrival: string;
  scheduled_departure: string;
  primary_time: string;
  predicted_time: string;
  delay_minutes: number;
  platform: string;
  is_origin: boolean;
  is_destination: boolean;
  operational_status: string;
  badge_color: string;
  current_location: string;
  current_speed_kmh: number;
}

interface LiveBoardResponse {
  station_code: string;
  station_name: string;
  city: string;
  platforms_count: number;
  query_window_hours: number;
  board_time: string;
  total_trains: number;
  trains: LiveBoardTrain[];
}

const QUICK_STATIONS = [
  { code: "MAS", name: "Chennai Central" },
  { code: "MS", name: "Chennai Egmore" },
  { code: "TPJ", name: "Tiruchirappalli Jn" },
  { code: "MDU", name: "Madurai Jn" },
  { code: "CBE", name: "Coimbatore Jn" },
  { code: "SA", name: "Salem Jn" },
  { code: "ED", name: "Erode Jn" },
  { code: "TEN", name: "Tirunelveli Jn" },
];

export const LiveStationBoard: React.FC = () => {
  const [stationCode, setStationCode] = useState<string>("TPJ");
  const [windowHours, setWindowHours] = useState<number>(8);
  const [directionFilter, setDirectionFilter] = useState<"all" | "arrivals" | "departures">("all");
  const [stations, setStations] = useState<any[]>([]);
  const [boardData, setBoardData] = useState<LiveBoardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStations()
      .then((data) => {
        if (data && data.stations) setStations(data.stations);
      })
      .catch(console.warn);
  }, []);

  const loadBoard = (code: string, hours: number) => {
    if (!code) return;
    setLoading(true);
    setError(null);

    fetchStationLiveBoard(code, hours)
      .then((data) => {
        setBoardData(data);
      })
      .catch((err) => {
        console.error("Live station board error:", err);
        setError(`Unable to load live board for station ${code}.`);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBoard(stationCode, windowHours);
  }, [stationCode, windowHours]);

  const handleStationSelect = (code: string) => {
    setStationCode(code);
  };

  // Filter trains by direction
  const filteredTrains = boardData?.trains.filter((t) => {
    if (directionFilter === "arrivals") return !t.is_origin;
    if (directionFilter === "departures") return !t.is_destination;
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      
      {/* Header & Station Selector Card */}
      <div className="bg-gradient-to-r from-railway-dark to-railway-card rounded-2xl border border-railway-border/80 p-4 sm:p-6 shadow-xl space-y-4 relative overflow-hidden">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-railway-accent to-blue-600 flex items-center justify-center text-white shadow-lg shadow-railway-accent/25">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Live Station Departure & Arrival Board
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold uppercase">
                  Where Is My Train
                </span>
              </div>
              <p className="text-xs text-railway-textSecondary mt-0.5">
                Real-time electronic timetable display with live platform assignments and delays
              </p>
            </div>
          </div>

          {/* Time Window Tabs */}
          <div className="flex items-center gap-1 bg-railway-darkest/80 p-1 rounded-xl border border-railway-border/60 self-start md:self-auto">
            {[2, 4, 8, 24].map((h) => (
              <button
                key={h}
                onClick={() => setWindowHours(h)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  windowHours === h
                    ? "bg-railway-accent text-white shadow-sm"
                    : "text-railway-textMuted hover:text-white"
                }`}
              >
                {h === 24 ? "All Today" : `${h} Hours`}
              </button>
            ))}
          </div>
        </div>

        {/* Station Autocomplete Input */}
        <div className="pt-2">
          <StationAutocomplete
            label="Search or Change Railway Station:"
            placeholder="Type Station Name or Code (e.g. Trichy, MAS, Madurai, Coimbatore)..."
            value={stationCode}
            onChange={setStationCode}
            stations={stations}
            onSelect={(stn) => setStationCode(stn.code)}
          />
        </div>

        {/* Quick Station Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] font-bold text-railway-textMuted uppercase tracking-wider">
            Major Tamil Nadu Junctions:
          </span>
          {QUICK_STATIONS.map((st) => (
            <button
              key={st.code}
              onClick={() => handleStationSelect(st.code)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                stationCode === st.code
                  ? "bg-railway-accent text-white border-railway-accent shadow-sm"
                  : "bg-railway-darkest/70 text-railway-textSecondary border-railway-border/60 hover:text-white hover:border-railway-border"
              }`}
            >
              {st.name} ({st.code})
            </button>
          ))}
        </div>

      </div>

      {/* Live Station Board View */}
      {boardData && (
        <div className="space-y-4">
          
          {/* Station Summary Ribbon */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-railway-surface/80 rounded-2xl border border-railway-border/60 p-4">
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-railway-accent" />
                {boardData.station_name} ({boardData.station_code})
                <span className="text-xs font-normal text-railway-textMuted">
                  • {boardData.platforms_count} Platforms
                </span>
              </h3>
              <p className="text-xs text-railway-textSecondary mt-0.5">
                Showing {filteredTrains.length} coaching train services (Next {windowHours}h window • As of {boardData.board_time})
              </p>
            </div>

            {/* Direction Filter Tabs */}
            <div className="flex items-center gap-1 bg-railway-darkest p-1 rounded-xl border border-railway-border">
              <button
                onClick={() => setDirectionFilter("all")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  directionFilter === "all" ? "bg-railway-card text-white shadow-sm" : "text-railway-textMuted hover:text-white"
                }`}
              >
                All ({boardData.trains.length})
              </button>
              <button
                onClick={() => setDirectionFilter("departures")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  directionFilter === "departures" ? "bg-railway-card text-white shadow-sm" : "text-railway-textMuted hover:text-white"
                }`}
              >
                Departures
              </button>
              <button
                onClick={() => setDirectionFilter("arrivals")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  directionFilter === "arrivals" ? "bg-railway-card text-white shadow-sm" : "text-railway-textMuted hover:text-white"
                }`}
              >
                Arrivals
              </button>
            </div>
          </div>

          {/* Trains List / Board */}
          {loading ? (
            <div className="p-12 text-center text-railway-textSecondary space-y-2">
              <div className="w-8 h-8 border-2 border-railway-accent border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono">Querying station master timetable & live telemetry...</p>
            </div>
          ) : filteredTrains.length === 0 ? (
            <div className="p-12 text-center text-railway-textMuted bg-railway-surface/40 rounded-2xl border border-railway-border/40">
              No trains scheduled at {boardData.station_name} within the selected {windowHours} hour window.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredTrains.map((train) => {
                const isDelayed = train.delay_minutes > 5;

                return (
                  <div
                    key={train.train_number}
                    className="bg-railway-card/80 hover:bg-railway-card border border-railway-border/70 rounded-2xl p-4 sm:p-5 shadow-md transition-all hover:border-railway-accent/40 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                  >
                    
                    {/* Left: Train Info & Route */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono font-extrabold text-lg text-white">
                          {train.train_number}
                        </span>
                        <h4 className="font-bold text-white text-base group-hover:text-railway-accent transition-colors">
                          {train.train_name}
                        </h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-railway-darkest text-railway-gold border border-railway-border">
                          {train.train_type}
                        </span>
                        
                        {/* Status Badge */}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          train.operational_status === "At Platform"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse"
                            : train.operational_status === "Departed"
                            ? "bg-gray-500/20 text-gray-400 border border-gray-500/40"
                            : isDelayed
                            ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                        }`}>
                          {train.operational_status}
                        </span>
                      </div>

                      {/* Route strip */}
                      <p className="text-xs text-railway-textSecondary flex items-center gap-1.5">
                        <span className="font-medium text-white">{train.origin_name}</span>
                        <span className="text-railway-accent">➔</span>
                        <span className="font-medium text-white">{train.destination_name}</span>
                        <span className="text-railway-border">•</span>
                        <span className="text-railway-textMuted">{train.current_location}</span>
                      </p>
                    </div>

                    {/* Right: Timing, Platform, Delay */}
                    <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-railway-border/40">
                      
                      {/* Scheduled vs Predicted */}
                      <div className="text-left md:text-right">
                        <span className="text-[10px] uppercase font-bold text-railway-textMuted tracking-wider block">
                          {train.is_destination ? "Arrival Time" : "Departure Time"}
                        </span>
                        <div className="flex items-baseline gap-1.5 md:justify-end">
                          <span className="font-mono font-extrabold text-lg text-white">
                            {train.predicted_time}
                          </span>
                          {isDelayed && (
                            <span className="text-[11px] font-mono text-railway-textMuted line-through">
                              {train.primary_time}
                            </span>
                          )}
                        </div>
                        <span className={`text-[10px] font-mono font-bold block ${
                          isDelayed ? "text-amber-400" : "text-emerald-400"
                        }`}>
                          {isDelayed ? `+${train.delay_minutes}m Late` : "On Time"}
                        </span>
                      </div>

                      {/* Prominent Platform Pill */}
                      <div className="flex flex-col items-center justify-center min-w-[64px] py-2 px-3 rounded-xl bg-railway-darkest border border-railway-accent/40 shadow-inner">
                        <span className="text-[9px] uppercase font-bold text-railway-textMuted tracking-wider">
                          Platform
                        </span>
                        <span className="font-mono font-black text-xl text-railway-accent">
                          {train.platform}
                        </span>
                      </div>

                      {/* Quick Track Action Button */}
                      <Link
                        to={`/train/${train.train_number}`}
                        className="p-2.5 rounded-xl bg-railway-surface hover:bg-railway-accent text-railway-textSecondary hover:text-white border border-railway-border hover:border-railway-accent transition-all cursor-pointer flex items-center justify-center shadow-sm"
                        title="Live GPS Train Tracker"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
