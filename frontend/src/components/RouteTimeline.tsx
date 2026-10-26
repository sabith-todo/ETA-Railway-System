import React from "react";
import { CheckCircle, Circle, Train, Gauge } from "lucide-react";
import { RouteStation } from "../types";

interface RouteTimelineProps {
  stations: RouteStation[];
  trainNumber: string;
  trainName: string;
  currentSpeed: number;
  currentDelay: number;
}

export const RouteTimeline: React.FC<RouteTimelineProps> = ({
  stations,
  trainNumber,
  trainName,
  currentSpeed,
  currentDelay
}) => {
  if (!stations || stations.length === 0) return null;

  const currentIndex = stations.findIndex((s) => s.is_current);
  const passedCount = currentIndex >= 0 ? currentIndex : 0;
  const progressPercent = Math.round((passedCount / Math.max(1, stations.length - 1)) * 100);

  return (
    <div className="bg-railway-surface/60 rounded-2xl border border-railway-border/80 p-6 shadow-xl space-y-5">
      {/* Progress Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Train className="w-4 h-4 text-railway-accent" />
            Live Route Timeline & Section Progress
          </h3>
          <p className="text-xs text-railway-textSecondary mt-0.5">
            {trainNumber} {trainName} • Journey Completion: <strong className="text-railway-accent font-mono">{progressPercent}%</strong>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-railway-dark/70 border border-railway-border">
              <Gauge className="w-3.5 h-3.5 text-railway-accent" />
              <span className="text-white font-bold">{currentSpeed} km/h</span>
            </div>
            <div className={`px-2.5 py-1 rounded-xl border font-bold ${
              currentDelay > 0 ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            }`}>
              {currentDelay > 0 ? `+${currentDelay}m` : "On Time"}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Passed
            </span>
            <span className="flex items-center gap-1 text-railway-accent">
              <span className="w-2 h-2 rounded-full bg-railway-accent animate-ping" /> Current
            </span>
            <span className="flex items-center gap-1 text-railway-textMuted">
              <span className="w-2 h-2 rounded-full bg-railway-border" /> Upcoming
            </span>
          </div>
        </div>
      </div>

      {/* Progress Line */}
      <div className="w-full h-1.5 bg-railway-darkest rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 via-railway-accent to-railway-gold transition-all duration-700"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Horizontal Station Nodes on desktop, wrapped on mobile */}
      <div className="relative pt-3 pb-2 overflow-x-auto">
        <div className="flex items-start justify-between min-w-[700px] relative">
          
          {/* Connecting line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-railway-border/60 -z-0" />

          {stations.map((st) => {
            const isPassed = st.status === "Passed";
            const isCurrent = st.is_current;

            return (
              <div 
                key={st.station_code}
                className="flex flex-col items-center text-center relative z-10 flex-1 max-w-[120px]"
              >
                {/* Node Icon */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  isPassed
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : isCurrent
                    ? "bg-railway-accent border-white text-white shadow-lg shadow-railway-accent/50 scale-125 animate-pulse"
                    : "bg-railway-dark border-railway-border text-railway-textMuted"
                }`}>
                  {isPassed ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Train className="w-4 h-4" />
                  ) : (
                    <Circle className="w-3 h-3" />
                  )}
                </div>

                {/* Station Name */}
                <div className="mt-2.5 space-y-0.5">
                  <span className={`text-xs font-bold block leading-tight ${
                    isCurrent ? "text-railway-accent" : isPassed ? "text-railway-textSecondary" : "text-white"
                  }`}>
                    {st.station_name || st.station_code}
                  </span>
                  <span className="text-[10px] font-mono text-railway-textMuted block">
                    {st.station_code} • {st.distance_km}km
                  </span>
                  {isCurrent && (
                    <span className="inline-block mt-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-railway-accent/20 text-railway-accent font-bold uppercase">
                      Live Telemetry
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
