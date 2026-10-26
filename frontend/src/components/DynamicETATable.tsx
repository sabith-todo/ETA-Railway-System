import React from "react";
import { ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
import { StationETARow } from "../types";

interface DynamicETATableProps {
  stations: StationETARow[];
  predictionSource: string;
}

export const DynamicETATable: React.FC<DynamicETATableProps> = ({ stations, predictionSource }) => {
  if (!stations || stations.length === 0) {
    return (
      <div className="p-8 text-center text-railway-textMuted bg-railway-surface/40 rounded-xl border border-railway-border">
        No upcoming stations available for this train run.
      </div>
    );
  }

  return (
    <div className="bg-railway-surface/60 rounded-2xl border border-railway-border/80 overflow-hidden shadow-xl">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-railway-border flex flex-wrap items-center justify-between gap-3 bg-railway-dark/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-railway-accent" />
              Dynamic ETA Forecast Table
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-railway-accent/15 text-railway-accent border border-railway-accent/30">
              Core Innovation
            </span>
          </div>
          <p className="text-xs text-railway-textSecondary mt-0.5">
            Recalculated in real-time across each remaining block section
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-railway-textMuted">Engine Source:</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border flex items-center gap-1.5 ${
            predictionSource === "ML" 
              ? "bg-purple-500/10 text-purple-400 border-purple-500/30" 
              : "bg-blue-500/10 text-blue-400 border-blue-500/30"
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {predictionSource === "ML" ? "Gradient Boosting Regressor" : "Statistical Fallback"}
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-railway-border/60 bg-railway-darkest/40 text-[11px] uppercase tracking-wider text-railway-textMuted font-semibold">
              <th className="py-3 px-5">Upcoming Station</th>
              <th className="py-3 px-4">Distance</th>
              <th className="py-3 px-4">Scheduled</th>
              <th className="py-3 px-5 text-railway-accent">Predicted ETA</th>
              <th className="py-3 px-4">Delay Impact</th>
              <th className="py-3 px-4">Expected Window</th>
              <th className="py-3 px-5 text-right">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-railway-border/30 text-xs">
            {stations.map((st, idx) => {
              const isTerminus = idx === stations.length - 1;
              const delay = st.delay_minutes;
              const delayBadge = 
                delay <= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                delay <= 15 ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                "bg-red-500/10 text-red-400 border-red-500/30";

              return (
                <tr 
                  key={st.station_code}
                  className={`hover:bg-railway-hover/30 transition-colors ${
                    isTerminus ? "bg-railway-accentSoft/20 font-medium" : ""
                  }`}
                >
                  {/* Station Name & Code */}
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {st.station_name || st.station_code}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-railway-card text-railway-textMuted border border-railway-border">
                        {st.station_code}
                      </span>
                      {isTerminus && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-railway-gold/20 text-railway-gold font-semibold uppercase">
                          Terminus
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Distance */}
                  <td className="py-3.5 px-4 text-railway-textSecondary font-mono">
                    {st.distance_from_origin_km} km
                  </td>

                  {/* Scheduled */}
                  <td className="py-3.5 px-4 text-railway-textMuted font-mono">
                    {st.scheduled_eta}
                  </td>

                  {/* Predicted Dynamic ETA */}
                  <td className="py-3.5 px-5 font-mono font-bold text-white text-sm">
                    <span className="text-railway-accent bg-railway-accent/10 px-2 py-1 rounded border border-railway-accent/20">
                      {st.predicted_eta}
                    </span>
                  </td>

                  {/* Delay */}
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border font-mono ${delayBadge}`}>
                      {delay > 0 ? `+${delay} min` : "On Time"}
                    </span>
                  </td>

                  {/* Prediction Range */}
                  <td className="py-3.5 px-4 text-railway-textSecondary font-mono text-[11px]">
                    {st.range_lower} – {st.range_upper}
                  </td>

                  {/* Confidence Bar & Percentage */}
                  <td className="py-3.5 px-5 text-right">
                    <div className="inline-flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className={`w-3.5 h-3.5 ${
                          st.confidence_percent >= 85 ? "text-emerald-400" :
                          st.confidence_percent >= 75 ? "text-amber-400" : "text-red-400"
                        }`} />
                        <span className="font-bold font-mono text-white text-xs">
                          {st.confidence_percent}%
                        </span>
                      </div>
                      <div className="w-16 h-1.5 bg-railway-darkest rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            st.confidence_percent >= 85 ? "bg-emerald-500" :
                            st.confidence_percent >= 75 ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${st.confidence_percent}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Disclaimer */}
      <div className="px-6 py-3 bg-railway-darkest/60 border-t border-railway-border/60 flex items-center justify-between text-[11px] text-railway-textMuted">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-railway-textMuted" />
          <span>Dynamic ETA is an AI regression forecast, accounting for live signal headway, weather, and sectional TSRs. Not a static schedule guarantee.</span>
        </div>
        <span className="hidden sm:inline font-mono">
          Updated continuously via WebSocket
        </span>
      </div>
    </div>
  );
};
