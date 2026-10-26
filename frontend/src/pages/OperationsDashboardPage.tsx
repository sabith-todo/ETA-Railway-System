import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  Activity, ShieldAlert, 
  GitBranch, Layers, RefreshCw 
} from "lucide-react";
import { 
  fetchDashboardSummary, fetchHighRiskTrains, fetchDownstreamRipple, fetchSections 
} from "../services/api";
import { DashboardSummary, HighRiskTrain, CascadingChain } from "../types";

interface OperationsDashboardPageProps {
  lastWsEvent?: any;
}

export const OperationsDashboardPage: React.FC<OperationsDashboardPageProps> = ({ lastWsEvent }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [highRiskTrains, setHighRiskTrains] = useState<HighRiskTrain[]>([]);
  const [cascadingChains, setCascadingChains] = useState<CascadingChain[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOperationsData = useCallback(async () => {
    try {
      const [sum, hrt, rip, sec] = await Promise.all([
        fetchDashboardSummary(),
        fetchHighRiskTrains(),
        fetchDownstreamRipple(),
        fetchSections()
      ]);
      setSummary(sum);
      setHighRiskTrains(hrt.high_risk_trains || []);
      setCascadingChains(rip.cascading_chains || []);
      setSections(sec.sections || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOperationsData();
  }, [loadOperationsData]);

  // Reactive WebSocket listener to update operations room live on events
  useEffect(() => {
    if (!lastWsEvent) return;

    if (
      lastWsEvent.type === "EVENT_INJECTED" || 
      lastWsEvent.type === "SIM_RESET" || 
      lastWsEvent.type === "ETA_RECALCULATED"
    ) {
      loadOperationsData();
    }
  }, [lastWsEvent, loadOperationsData]);

  if (loading || !summary) {
    return (
      <div className="p-16 text-center text-railway-textSecondary space-y-3">
        <div className="w-10 h-10 border-2 border-railway-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-mono text-sm">Synthesizing network telemetry and cascading headway models...</p>
      </div>
    );
  }

  const congestedSections = sections.filter(s => s.congestion_level !== "low" || s.has_speed_restriction);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-railway-accent" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Railway Network Operations & Control Room
            </h1>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
              Corridor Telemetry
            </span>
          </div>
          <p className="text-xs sm:text-sm text-railway-textSecondary mt-0.5">
            Automated high-risk rake detection, headway bottleneck tracking, and downstream ripple forecasting
          </p>
        </div>

        <button
          onClick={loadOperationsData}
          className="px-3.5 py-1.5 rounded-xl bg-railway-card border border-railway-border text-xs text-white flex items-center gap-2 hover:bg-railway-hover transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Network State
        </button>
      </div>

      {/* Macro Network Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        
        <div className="p-3.5 rounded-xl bg-railway-surface border border-railway-border text-center">
          <span className="text-[10px] uppercase font-bold text-railway-textMuted block">Active Trains</span>
          <span className="text-xl font-mono font-bold text-white mt-1 block">{summary.total_active_trains}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-railway-surface border border-emerald-500/30 text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block">On Time</span>
          <span className="text-xl font-mono font-bold text-emerald-400 mt-1 block">{summary.on_time_trains}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-railway-surface border border-amber-500/30 text-center">
          <span className="text-[10px] uppercase font-bold text-amber-400 block">Delayed</span>
          <span className="text-xl font-mono font-bold text-amber-400 mt-1 block">{summary.delayed_trains}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-railway-surface border border-red-500/30 text-center">
          <span className="text-[10px] uppercase font-bold text-red-400 block">Severely Delayed</span>
          <span className="text-xl font-mono font-bold text-red-400 mt-1 block">{summary.severely_delayed_trains}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-railway-surface border border-red-500/30 text-center">
          <span className="text-[10px] uppercase font-bold text-red-400 block">High Risk Rakes</span>
          <span className="text-xl font-mono font-bold text-red-400 mt-1 block">{summary.high_risk_trains}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-railway-surface border border-amber-500/30 text-center">
          <span className="text-[10px] uppercase font-bold text-amber-400 block">Congested Tracks</span>
          <span className="text-xl font-mono font-bold text-amber-400 mt-1 block">{summary.congested_sections}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-railway-surface border border-railway-border text-center">
          <span className="text-[10px] uppercase font-bold text-railway-textMuted block">Active TSRs</span>
          <span className="text-xl font-mono font-bold text-white mt-1 block">{summary.active_speed_restrictions}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-railway-accent/10 border border-railway-accent/30 text-center">
          <span className="text-[10px] uppercase font-bold text-railway-accent block">Net Delay Min</span>
          <span className="text-xl font-mono font-bold text-railway-accent mt-1 block">{summary.predicted_network_impact_min}m</span>
        </div>

      </div>

      {/* Downstream Delay Propagation / Cascading Ripple Model */}
      <div className="bg-railway-surface/60 rounded-2xl border border-railway-border/80 p-6 shadow-xl space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-railway-accent" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Downstream Cascading Delay Ripple Model
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-railway-accent/15 text-railway-accent border border-railway-accent/30">
              Simplified Network Physics
            </span>
          </div>
          <p className="text-xs text-railway-textSecondary mt-0.5">
            Illustrates how delay in primary train compounds headway holds, precedence halts, and platform conflicts on trailing rakes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {cascadingChains.map((chain, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-railway-dark/60 border border-railway-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-white">
                    Primary Disruption: {chain.primary_train.number} {chain.primary_train.name}
                  </span>
                  <span className="text-[10px] text-railway-textMuted block">
                    Location: {chain.primary_train.location} • Current Delay: <strong className="text-red-400">+{chain.primary_train.delay_minutes}m</strong>
                  </span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                  Loss: {chain.estimated_network_loss_minutes}m
                </span>
              </div>

              {/* Cascade steps */}
              <div className="space-y-2 pt-1">
                {chain.cascade_steps.map((step) => (
                  <div key={step.stage} className="flex items-start gap-2.5 text-xs">
                    <span className="w-4 h-4 rounded-full bg-railway-card border border-railway-border flex items-center justify-center text-[10px] font-mono text-railway-accent font-bold mt-0.5">
                      {step.stage}
                    </span>
                    <div>
                      <span className="text-white font-medium">{step.event}</span>
                      <span className="text-[11px] text-railway-textMuted block">↳ {step.impact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High-Risk Train Classification Table */}
      <div className="bg-railway-surface/60 rounded-2xl border border-railway-border/80 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-railway-border flex flex-wrap items-center justify-between gap-3 bg-railway-dark/50">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Automated Train Risk Classification Table
            </h3>
            <p className="text-xs text-railway-textSecondary mt-0.5">
              Classified by predicted downstream delay, recovery likelihood, and schedule uncertainty
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">🟢 Low</span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">🟡 Moderate</span>
            <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">🟠 High</span>
            <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">🔴 Severe</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-railway-border text-railway-textMuted uppercase text-[11px] bg-railway-darkest/40">
                <th className="py-3 px-4">Train</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Speed</th>
                <th className="py-3 px-4">Current Delay</th>
                <th className="py-3 px-4 text-railway-accent">Predicted Dest Delay</th>
                <th className="py-3 px-4">Risk Classification</th>
                <th className="py-3 px-4">Impact Diagnostics</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-railway-border/30">
              {highRiskTrains.map((t) => {
                const color = t.risk_color;
                const badgeClass = 
                  color === "red" ? "bg-red-500/20 text-red-400 border-red-500/40" :
                  color === "orange" ? "bg-orange-500/20 text-orange-400 border-orange-500/40" :
                  color === "yellow" ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
                  "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";

                return (
                  <tr key={t.number} className="hover:bg-railway-hover/20 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-white block">{t.number}</span>
                      <span className="text-[11px] text-railway-textSecondary">{t.name}</span>
                    </td>
                    <td className="py-3 px-4 text-railway-textSecondary font-medium">
                      {t.current_location}
                    </td>
                    <td className="py-3 px-4 font-mono text-white">
                      {t.current_speed_kmh} km/h
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      +{t.current_delay_min}m
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-railway-accent">
                      +{t.predicted_dest_delay}m
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border font-mono ${badgeClass}`}>
                        {t.risk_category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-railway-textMuted max-w-xs truncate">
                      {t.risk_reason}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/train/${t.number}`}
                        className="text-xs text-railway-accent hover:underline font-semibold"
                      >
                        Inspect →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Congested Sections & Speed Restrictions */}
      <div className="bg-railway-surface/60 rounded-2xl border border-railway-border/80 p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          Active Corridor Bottlenecks & Speed Restrictions
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {congestedSections.slice(0, 6).map((sec) => (
            <div key={sec.id} className="p-3.5 rounded-xl bg-railway-dark/60 border border-railway-border space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-white">{sec.from_station} → {sec.to_station}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                  sec.congestion_level === "high" ? "bg-red-500/10 text-red-400 border-red-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                }`}>
                  {sec.congestion_level} congestion
                </span>
              </div>
              <div className="text-[11px] text-railway-textMuted flex justify-between">
                <span>Distance: {sec.distance_km} km</span>
                {sec.has_speed_restriction ? (
                  <span className="text-amber-400 font-bold">TSR: {sec.speed_restriction_kmh} km/h</span>
                ) : (
                  <span>Speed: {sec.max_speed_kmh} km/h</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
