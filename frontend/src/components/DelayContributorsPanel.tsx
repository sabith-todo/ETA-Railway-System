import React from "react";
import { Info, Gauge } from "lucide-react";
import type { DelayContributor } from "../types";

interface DelayContributorsPanelProps {
  contributors: DelayContributor[];
  totalImpactMinutes: number;
}

export const DelayContributorsPanel: React.FC<DelayContributorsPanelProps> = ({
  contributors,
  totalImpactMinutes
}) => {
  return (
    <div className="bg-railway-surface/60 rounded-2xl border border-railway-border/80 p-6 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Gauge className="w-4 h-4 text-railway-accent" />
            Factors Influencing Forecast
          </h3>
          <p className="text-xs text-railway-textSecondary mt-0.5">
            Transparent attribution breakdown of expected operational slowdowns
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold tracking-wider text-railway-textMuted block">
            Total Predicted Impact
          </span>
          <span className="text-lg font-mono font-bold text-railway-accent">
            +{totalImpactMinutes} min
          </span>
        </div>
      </div>

      {/* Contributor List */}
      <div className="space-y-3 pt-2">
        {contributors.map((c) => {
          // Compute percentage of total impact
          const pct = totalImpactMinutes > 0 ? Math.round((c.impact_minutes / totalImpactMinutes) * 100) : 0;
          
          return (
            <div key={c.factor} className="p-3 rounded-xl bg-railway-dark/50 border border-railway-border/50">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{c.factor}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-railway-card text-railway-textMuted border border-railway-border">
                    {c.category}
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-amber-400">+{c.impact_minutes} min</span>
                  <span className="text-[10px] text-railway-textMuted">({pct}%)</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-railway-darkest rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-railway-accent transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(8, pct))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Transparent Labeling Alert Note */}
      <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5 text-[11px] text-blue-300">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p leading-relaxed>
          <strong>Notice:</strong> These delay factors are derived probabilistically by the Dynamic ML model from current track occupancy telemetry, active Temporary Speed Restrictions (TSRs), and historical dwell deviations.
        </p>
      </div>
    </div>
  );
};
