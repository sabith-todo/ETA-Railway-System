import React, { useState } from "react";
import { CheckCircle2, Circle, Clock, MapPin, Radio, Train, Search, ArrowRight, Gauge, Navigation, Calendar, Bell } from "lucide-react";
import { RouteStation } from "../types";
import { useAlarm } from "../context/AlarmContext";

interface StationProgressStepperProps {
  stations: RouteStation[];
  currentStationIdx: number;
  currentDelayMin: number;
  currentSpeedKmh?: number;
  trainNumber?: string;
  trainName?: string;
  isFutureDate?: boolean;
  journeyDate?: string;
  onOpenAlarmModal?: (stationCode: string) => void;
}

export const StationProgressStepper: React.FC<StationProgressStepperProps> = ({
  stations,
  currentStationIdx,
  currentDelayMin,
  currentSpeedKmh = 75,
  trainNumber,
  trainName,
  isFutureDate = false,
  journeyDate,
  onOpenAlarmModal,
}) => {
  const { activeAlarm } = useAlarm();
  const [filterQuery, setFilterQuery] = useState("");

  if (!stations || stations.length === 0) {
    return (
      <div className="p-6 text-center text-railway-textMuted bg-railway-surface/50 rounded-xl border border-railway-border/40">
        No station itinerary available.
      </div>
    );
  }

  const safeIdx = Math.max(0, Math.min(currentStationIdx, stations.length - 1));
  const currentSt = stations[safeIdx];
  const nextSt = safeIdx < stations.length - 1 ? stations[safeIdx + 1] : null;
  const terminalSt = stations[stations.length - 1];

  // Filter stations if user searched within route
  const displayedStations = filterQuery.trim()
    ? stations.filter(
        (s) =>
          s.station_name.toLowerCase().includes(filterQuery.toLowerCase()) ||
          s.station_code.toLowerCase().includes(filterQuery.toLowerCase()) ||
          (s.city && s.city.toLowerCase().includes(filterQuery.toLowerCase()))
      )
    : stations;

  return (
    <div className="space-y-5">
      
      {/* Live Train Status Overview Banner */}
      <div className="bg-gradient-to-r from-railway-dark to-railway-card p-4 sm:p-5 rounded-2xl border border-railway-border/80 shadow-xl space-y-3 relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${
              isFutureDate 
                ? "bg-gradient-to-br from-blue-600 to-indigo-600 shadow-blue-500/25" 
                : "bg-gradient-to-br from-railway-accent to-railway-gold shadow-railway-accent/25"
            }`}>
              {isFutureDate ? (
                <Calendar className="w-5 h-5" />
              ) : (
                <Train className="w-5 h-5 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold tracking-wider uppercase ${isFutureDate ? "text-blue-400" : "text-railway-accent"}`}>
                  {isFutureDate ? "Scheduled Route Itinerary" : "Live Running Status & Real-Time Tracking"}
                </span>
                {isFutureDate ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    📅 Scheduled for {journeyDate || "Future Date"}
                  </span>
                ) : (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    currentDelayMin > 20
                      ? "bg-railway-ruby/20 text-railway-ruby border border-railway-ruby/30"
                      : currentDelayMin > 5
                      ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                      : "bg-railway-emerald/15 text-railway-emerald border border-railway-emerald/30"
                  }`}>
                    {currentDelayMin === 0 ? "🟢 Running On Time" : `🟡 Late by ${Math.round(currentDelayMin)} mins`}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-white text-base mt-0.5">
                {isFutureDate 
                  ? `${stations[0]?.station_name} ➔ ${terminalSt.station_name}`
                  : (currentSt ? `Near ${currentSt.station_name}` : "En Route")}
              </h3>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <span className="text-[10px] text-railway-textMuted uppercase block">
              {isFutureDate ? "Service" : "Live Speed"}
            </span>
            <span className="font-mono font-bold text-white text-base sm:text-lg flex items-center justify-end gap-1">
              {!isFutureDate ? (
                <>
                  <Gauge className="w-3.5 h-3.5 text-railway-accent" />
                  {currentSpeedKmh} km/h
                </>
              ) : (
                <span className="text-blue-400 text-sm">Timetable</span>
              )}
            </span>
          </div>
        </div>

        {/* Next Stop & Final Destination Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-railway-border/50 text-xs">
          {nextSt && !isFutureDate && (
            <div className="flex items-center gap-2 text-railway-textSecondary bg-railway-darkest/60 px-3 py-2 rounded-xl border border-railway-border/40">
              <Navigation className="w-3.5 h-3.5 text-railway-accent flex-shrink-0" />
              <div className="truncate">
                <span className="text-railway-textMuted text-[10px] block">Next Stop:</span>
                <span className="font-bold text-white truncate">{nextSt.station_name} ({nextSt.station_code})</span>
                <span className="text-railway-textMuted text-[11px] block font-mono">
                  Exp: <strong className="text-railway-accent">{nextSt.predicted_arrival || nextSt.scheduled_arrival}</strong> • PF {nextSt.platform || 1}
                </span>
              </div>
            </div>
          )}

          {isFutureDate && (
            <div className="flex items-center gap-2 text-railway-textSecondary bg-railway-darkest/60 px-3 py-2 rounded-xl border border-railway-border/40">
              <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <div className="truncate">
                <span className="text-railway-textMuted text-[10px] block">Origin Departure:</span>
                <span className="font-bold text-white truncate">{stations[0]?.station_name}</span>
                <span className="text-railway-textMuted text-[11px] block font-mono">
                  Departs: <strong className="text-white">{stations[0]?.scheduled_departure}</strong> • PF {stations[0]?.platform || 1}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-railway-textSecondary bg-railway-darkest/60 px-3 py-2 rounded-xl border border-railway-border/40">
            <MapPin className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
            <div className="truncate">
              <span className="text-railway-textMuted text-[10px] block">Final Destination:</span>
              <span className="font-bold text-white truncate">{terminalSt.station_name}</span>
              <span className="text-railway-textMuted text-[11px] block font-mono">
                Arrival: <strong className="text-white">{terminalSt.scheduled_arrival}</strong> • {terminalSt.distance_km} km total
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Station Filter inside Trail */}
      <div className="relative">
        <Search className="w-4 h-4 text-railway-textMuted absolute left-3 top-3" />
        <input
          type="text"
          placeholder="Filter stations along this trail (e.g. Trichy, Dindigul, Salem)..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="w-full bg-railway-darkest/70 border border-railway-border/60 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-railway-textMuted focus:outline-none focus:border-railway-accent transition-colors font-medium"
        />
        {filterQuery && (
          <button
            onClick={() => setFilterQuery("")}
            className="absolute right-3 top-2.5 text-xs text-railway-textMuted hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Vertical Track Trail */}
      <div className="relative pl-1 sm:pl-2">
        <div className="space-y-4">
          {displayedStations.map((st, idx) => {
            const originalIndex = stations.findIndex((s) => s.station_code === st.station_code);
            const isPassed = !isFutureDate && originalIndex < currentStationIdx;
            const isCurrent = !isFutureDate && originalIndex === currentStationIdx;
            const isUpcoming = isFutureDate || originalIndex > currentStationIdx;
            const isTerminal = originalIndex === stations.length - 1;
            const isOrigin = originalIndex === 0;

            const schedArr = st.scheduled_arrival || "--:--";
            const schedDep = st.scheduled_departure || "--:--";
            const predArr = st.predicted_arrival || schedArr;
            const delay = isFutureDate ? 0 : (st.delay_minutes ?? Math.max(0, Math.round(currentDelayMin)));
            const pf = st.platform || (st.platforms ? String(st.platforms) : "1");

            return (
              <div key={`${st.station_code}_${originalIndex}`} className="relative flex items-start gap-3 sm:gap-4 group">
                {/* Vertical connector line */}
                {!isTerminal && (
                  <div
                    className={`absolute left-[15px] sm:left-[17px] top-[32px] bottom-[-22px] w-[3px] rounded-full transition-colors ${
                      isPassed
                        ? "bg-railway-emerald/70"
                        : isCurrent
                        ? "bg-gradient-to-b from-railway-accent via-amber-500 to-railway-border/40"
                        : "bg-railway-border/40"
                    }`}
                  />
                )}

                {/* Node Icon / Indicator */}
                <div className="relative z-10 flex-shrink-0 mt-0.5">
                  {isPassed ? (
                    <div className="w-8 h-8 rounded-full bg-railway-emerald/15 border border-railway-emerald/40 flex items-center justify-center text-railway-emerald shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : isCurrent ? (
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-10 h-10 rounded-full bg-railway-accent/30 animate-ping" />
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-railway-accent to-amber-500 flex items-center justify-center text-white shadow-lg shadow-railway-accent/50 border-2 border-railway-darkest">
                        <Train className="w-4 h-4 animate-bounce" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-railway-surface border border-railway-border/60 flex items-center justify-center text-railway-textMuted group-hover:border-railway-border group-hover:text-railway-textSecondary transition-colors">
                      <Circle className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Station Details Card */}
                <div
                  className={`flex-1 rounded-xl p-3 sm:p-4 transition-all ${
                    isCurrent
                      ? "bg-railway-card border-2 border-railway-accent shadow-xl shadow-railway-accent/15 ring-1 ring-railway-accent/30"
                      : isPassed
                      ? "bg-railway-surface/40 border border-railway-border/30 opacity-75"
                      : "bg-railway-surface/75 border border-railway-border/60 hover:border-railway-border"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    {/* Station Name & Badges */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                          {st.station_name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-railway-card text-railway-gold border border-railway-border/60">
                          {st.station_code}
                        </span>
                        {isOrigin && (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                            Origin
                          </span>
                        )}
                        {isTerminal && (
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20">
                            Destination
                          </span>
                        )}
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-railway-accent text-white shadow-md animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                            TRAIN IS HERE NOW
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-railway-textMuted flex-wrap">
                        {st.city && st.city !== st.station_name && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-railway-accent" />
                            {st.city}
                          </span>
                        )}
                        <span>{st.distance_km} km</span>
                        <span className="text-railway-textSecondary font-semibold px-1.5 py-0.2 rounded bg-railway-card border border-railway-border/40">
                          Platform {pf}
                        </span>
                        {isCurrent && (
                          <span className="text-railway-emerald font-semibold">
                            Speed: {currentSpeedKmh} km/h
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timing & Delay Column */}
                    <div className="flex sm:flex-col items-end justify-between sm:justify-center pt-2 sm:pt-0 border-t sm:border-t-0 border-railway-border/30">
                      <div className="text-left sm:text-right">
                        <div className="flex items-center gap-2 sm:justify-end">
                          <span className="text-xs text-railway-textMuted">Scheduled:</span>
                          <span className="text-xs font-mono font-medium text-railway-textSecondary">
                            {isOrigin ? schedDep : schedArr}
                          </span>
                        </div>
                        
                        {!isOrigin && (
                          <div className="flex items-center gap-2 sm:justify-end mt-0.5">
                            <span className="text-xs text-railway-textMuted flex items-center gap-0.5">
                              <Clock className="w-3 h-3 text-railway-accent" />
                              Estimated:
                            </span>
                            <span className={`text-xs font-mono font-bold ${
                              delay > 10 ? "text-railway-ruby" : delay > 0 ? "text-amber-400" : "text-railway-emerald"
                            }`}>
                              {predArr}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Delay Badge & Alarm Button */}
                      {!isPassed && !isOrigin && (
                        <div className="sm:mt-1 flex items-center gap-1.5 flex-wrap justify-end">
                          {delay === 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-railway-emerald/10 text-railway-emerald border border-railway-emerald/30">
                              On Time
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              delay > 20
                                ? "bg-railway-ruby/15 text-railway-ruby border border-railway-ruby/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            }`}>
                              +{delay}m Late
                            </span>
                          )}

                          {/* Station Arrival Alarm Action */}
                          {onOpenAlarmModal && (
                            activeAlarm && activeAlarm.stationCode === st.station_code && activeAlarm.isArmed ? (
                              <button
                                onClick={() => onOpenAlarmModal(st.station_code)}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 animate-pulse cursor-pointer"
                                title="Alarm armed for this station! Click to manage."
                              >
                                <Bell className="w-3 h-3" />
                                Alarm Active
                              </button>
                            ) : (
                              <button
                                onClick={() => onOpenAlarmModal(st.station_code)}
                                className="p-1 sm:px-1.5 sm:py-0.5 rounded-lg text-[10px] font-semibold bg-railway-darkest/80 hover:bg-railway-accent text-railway-textMuted hover:text-white border border-railway-border/60 hover:border-railway-accent flex items-center gap-1 transition-colors cursor-pointer"
                                title={`Set wake-up alarm for ${st.station_name}`}
                              >
                                <Bell className="w-3 h-3 text-railway-accent group-hover:text-white" />
                                <span className="hidden sm:inline">Set Alarm</span>
                              </button>
                            )
                          )}
                        </div>
                      )}
                      {isPassed && (
                        <span className="sm:mt-1 px-2 py-0.5 rounded text-[10px] font-medium bg-railway-surface text-railway-textMuted border border-railway-border/30">
                          Departed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
