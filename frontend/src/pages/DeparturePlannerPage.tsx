import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  Clock, Home, CheckCircle2, MapPin, Train, 
  ArrowRight, ShieldCheck, Sparkles, Navigation, Bell 
} from "lucide-react";
import { computeWhenToLeave, fetchStations, fetchTrainList, fetchTrainRoute } from "../services/api";
import { StationAutocomplete } from "../components/StationAutocomplete";
import { Train as TrainType } from "../types";

export const DeparturePlannerPage: React.FC = () => {
  const [trainId, setTrainId] = useState("12635");
  const [stationCode, setStationCode] = useState("TPJ");
  const [stations, setStations] = useState<any[]>([]);
  const [trains, setTrains] = useState<TrainType[]>([]);
  const [routeStations, setRouteStations] = useState<any[]>([]);
  const [travelTime, setTravelTime] = useState(30);
  const [bufferTime, setBufferTime] = useState(20);

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load active train list & station list on mount
  useEffect(() => {
    fetchStations()
      .then((data) => {
        if (data && data.stations) setStations(data.stations);
      })
      .catch(console.warn);

    fetchTrainList()
      .then((data) => {
        if (data && data.trains) setTrains(data.trains);
      })
      .catch(console.warn);
  }, []);

  // Whenever train changes, load its route to filter stations
  useEffect(() => {
    if (!trainId) return;
    fetchTrainRoute(trainId)
      .then((data) => {
        if (data && data.stations) {
          setRouteStations(data.stations);
          // If current stationCode is not in route, set to first intermediate stop
          const exists = data.stations.some((s: any) => s.station_code === stationCode);
          if (!exists && data.stations.length > 1) {
            setStationCode(data.stations[Math.min(2, data.stations.length - 1)].station_code);
          }
        }
      })
      .catch(() => {
        setRouteStations([]);
      });
  }, [trainId]);

  const handleCompute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await computeWhenToLeave({
        train_id: trainId.trim(),
        station_code: stationCode.trim().toUpperCase(),
        travel_time_to_station_min: Number(travelTime),
        desired_station_buffer_min: Number(bufferTime),
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to calculate optimal departure time.");
    } finally {
      setLoading(false);
    }
  };

  const selectedTrain = trains.find((t) => t.number === trainId);
  const activeStationList = routeStations.length > 0 ? routeStations : stations;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-railway-accent" />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            "When Should I Leave Home?" Smart Departure Tool
          </h1>
          <span className="text-xs px-2 py-0.5 rounded bg-railway-accent/10 text-railway-accent border border-railway-accent/20 font-bold uppercase">
            Passenger Convenience
          </span>
        </div>
        <p className="text-xs sm:text-sm text-railway-textSecondary mt-1">
          Eliminate wasted platform waiting time by aligning your home departure with dynamic live train delay forecasts.
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-railway-surface/80 rounded-2xl border border-railway-border/80 p-5 sm:p-7 shadow-xl space-y-5">
        <form onSubmit={handleCompute} className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Train Selector Dropdown with Train Autocomplete */}
            <div>
              <label className="block text-[11px] font-bold text-railway-textMuted uppercase tracking-wider mb-1 flex items-center gap-1">
                <Train className="w-3.5 h-3.5 text-railway-gold" /> Train Service
              </label>
              <select
                value={trainId}
                onChange={(e) => setTrainId(e.target.value)}
                className="w-full bg-railway-darkest/90 border border-railway-border rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-medium focus:outline-none focus:border-railway-accent cursor-pointer"
              >
                {trains.map((t) => (
                  <option key={t.number} value={t.number} className="bg-railway-darkest text-white">
                    {t.number} - {t.name} ({t.origin} ➔ {t.destination})
                  </option>
                ))}
              </select>
              {selectedTrain && (
                <span className="text-[10px] text-railway-textMuted block mt-1 truncate">
                  {selectedTrain.origin} ➔ {selectedTrain.destination} ({selectedTrain.type})
                </span>
              )}
            </div>

            {/* Boarding Station (Filtered to Train's Route) */}
            <div>
              <StationAutocomplete
                label="Your Boarding Station"
                icon={<MapPin className="w-3.5 h-3.5 text-railway-accent" />}
                placeholder="e.g. Trichy / TPJ / Salem"
                value={stationCode}
                onChange={setStationCode}
                stations={activeStationList}
                onSelect={(stn) => setStationCode(stn.code)}
              />
              {routeStations.length > 0 && (
                <span className="text-[10px] text-emerald-400 block mt-1">
                  ✓ {routeStations.length} stops along this train's route
                </span>
              )}
            </div>

            {/* Travel Time */}
            <div>
              <label className="block text-[11px] font-bold text-railway-textMuted uppercase tracking-wider mb-1">
                Home → Station Travel Time
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={travelTime}
                  onChange={(e) => setTravelTime(Number(e.target.value))}
                  className="w-full bg-railway-darkest/70 border border-railway-border rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-railway-accent"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-railway-textMuted">mins</span>
              </div>
            </div>

            {/* Desired Station Buffer */}
            <div>
              <label className="block text-[11px] font-bold text-railway-textMuted uppercase tracking-wider mb-1">
                Desired Platform Buffer
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={bufferTime}
                  onChange={(e) => setBufferTime(Number(e.target.value))}
                  className="w-full bg-railway-darkest/70 border border-railway-border rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-railway-accent"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-railway-textMuted">mins</span>
              </div>
            </div>

          </div>

          {/* Quick Popular Boarding Presets */}
          <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-railway-border/40 text-xs">
            <span className="text-railway-textMuted font-semibold text-[11px]">Popular Boarding Pairs:</span>
            {[
              { label: "12635 Vaigai @ Trichy (TPJ)", t: "12635", s: "TPJ" },
              { label: "12637 Pandian @ Dindigul (DG)", t: "12637", s: "DG" },
              { label: "12675 Kovai @ Salem (SA)", t: "12675", s: "SA" },
              { label: "20643 Vande Bharat @ Tiruppur (TUP)", t: "20643", s: "TUP" },
              { label: "12631 Nellai @ Kovilpatti (CVP)", t: "12631", s: "CVP" },
              { label: "12627 Karnataka @ Salem (SA)", t: "12627", s: "SA" },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setTrainId(p.t);
                  setStationCode(p.s);
                }}
                className="px-2.5 py-1 rounded-lg bg-railway-card border border-railway-border/60 hover:border-railway-accent/50 text-railway-textSecondary hover:text-white font-mono text-[11px] transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-gradient-to-r from-railway-accent to-railway-gold hover:from-railway-accentHover hover:to-railway-accent text-white font-bold text-xs sm:text-sm shadow-lg shadow-railway-accent/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? "Computing Dynamic Departure Time..." : "Calculate Optimal Departure Time"}
            </button>
          </div>

        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Output Card with Graphical Departure Timeline */}
      {result && (
        <div className="bg-gradient-to-br from-railway-surface to-railway-card rounded-2xl border border-railway-border p-6 shadow-2xl space-y-6 animate-slide-in">
          
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-railway-border/60">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-railway-textMuted block">
                Optimized Departure Recommendation
              </span>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1 flex items-center gap-3">
                <Home className="w-8 h-8 text-railway-accent animate-pulse" />
                Leave at {result.recommended_leave_time}
              </h3>
              <p className="text-xs text-railway-textSecondary mt-1">
                For {result.train_id} {result.train_name} boarding at <strong>{result.station_name}</strong>
              </p>
            </div>

            <div className="text-right bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                Platform Wait Time Saved
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-400">
                +{result.time_saved_due_to_delay_min} mins
              </span>
              <span className="text-[10px] text-railway-textMuted block">
                vs static timetable wait
              </span>
            </div>
          </div>

          {/* Graphical Step-by-Step Departure Timeline */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-railway-textMuted uppercase tracking-wider block">
              Door-to-Train Itinerary Timeline:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Step 1: Leave Home */}
              <div className="bg-railway-darkest/90 border-2 border-railway-accent/60 rounded-xl p-4 space-y-1 relative">
                <span className="text-[9px] font-bold uppercase text-railway-accent tracking-wider block">
                  STEP 1: DEPART HOME
                </span>
                <span className="font-mono text-2xl font-extrabold text-white block">
                  {result.recommended_leave_time}
                </span>
                <span className="text-[11px] text-railway-textSecondary block">
                  Transit to {result.station_name} ({result.travel_time_min}m)
                </span>
              </div>

              {/* Step 2: Reach Station */}
              <div className="bg-railway-darkest/90 border border-railway-border rounded-xl p-4 space-y-1">
                <span className="text-[9px] font-bold uppercase text-blue-400 tracking-wider block">
                  STEP 2: REACH STATION
                </span>
                <span className="font-mono text-2xl font-extrabold text-white block">
                  {/* Calculate reach time: leave time + travel time */}
                  {(() => {
                    try {
                      const [h, m] = result.recommended_leave_time.split(":").map(Number);
                      const tot = (h * 60 + m + result.travel_time_min) % (24 * 60);
                      return `${String(Math.floor(tot / 60)).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
                    } catch {
                      return "--:--";
                    }
                  })()}
                </span>
                <span className="text-[11px] text-railway-textSecondary block">
                  {result.station_buffer_min}m buffer on platform
                </span>
              </div>

              {/* Step 3: Train Boarding */}
              <div className="bg-railway-darkest/90 border border-emerald-500/40 rounded-xl p-4 space-y-1">
                <span className="text-[9px] font-bold uppercase text-emerald-400 tracking-wider block">
                  STEP 3: BOARD TRAIN
                </span>
                <span className="font-mono text-2xl font-extrabold text-emerald-400 block">
                  {result.predicted_departure}
                </span>
                <span className="text-[11px] text-railway-textSecondary block">
                  Train Boarding (Delay: +{result.current_delay_minutes}m)
                </span>
              </div>

            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-railway-dark/60 border border-railway-border">
              <span className="text-railway-textMuted block text-[10px] uppercase">Timetable Scheduled</span>
              <span className="text-white font-mono font-bold text-base block mt-0.5">{result.scheduled_departure}</span>
              <span className="text-railway-textMuted text-[10px]">Official static timetable</span>
            </div>

            <div className="p-3.5 rounded-xl bg-railway-dark/60 border border-railway-accent/30">
              <span className="text-railway-accent block text-[10px] uppercase font-bold">Dynamic Predicted Arrival</span>
              <span className="text-railway-accent font-mono font-bold text-base block mt-0.5">{result.predicted_departure}</span>
              <span className="text-railway-textMuted text-[10px]">Current Delay: +{result.current_delay_minutes}m</span>
            </div>

            <div className="p-3.5 rounded-xl bg-railway-dark/60 border border-railway-border">
              <span className="text-railway-textMuted block text-[10px] uppercase">Planned Allowances</span>
              <span className="text-white font-mono font-bold text-base block mt-0.5">{result.travel_time_min + result.station_buffer_min} mins</span>
              <span className="text-railway-textMuted text-[10px]">{result.travel_time_min}m transit + {result.station_buffer_min}m buffer</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-railway-darkest/70 border border-railway-border text-xs text-railway-textSecondary flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p><strong>Guidance:</strong> {result.advice}</p>
              <Link
                to={`/train/${result.train_id}`}
                className="inline-flex items-center gap-1 text-railway-accent hover:underline font-semibold text-xs mt-1"
              >
                Track {result.train_id} {result.train_name} Live GPS Status ➔
              </Link>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
