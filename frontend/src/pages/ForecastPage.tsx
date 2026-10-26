import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { fetchDynamicETA } from "../services/api";
import { DynamicETAResponse } from "../types";
import { DelayForecastCard } from "../components/DelayForecastCard";
import { DelayContributorsPanel } from "../components/DelayContributorsPanel";

export const ForecastPage: React.FC = () => {
  const { id = "12627" } = useParams<{ id: string }>();
  const [etaData, setEtaData] = useState<DynamicETAResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadForecast = useCallback(async (trainId: string) => {
    try {
      setLoading(true);
      const data = await fetchDynamicETA(trainId);
      setEtaData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForecast(id);
  }, [id, loadForecast]);

  if (loading) {
    return (
      <div className="p-16 text-center text-railway-textSecondary space-y-3">
        <div className="w-10 h-10 border-2 border-railway-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-mono text-sm">Computing predictive delay propagation trajectory...</p>
      </div>
    );
  }

  if (!etaData) {
    return (
      <div className="p-12 text-center text-red-400">
        Could not load forecast data for Train {id}.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to={`/train/${id}`} className="text-xs text-railway-accent hover:underline flex items-center gap-1 mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Train {id}
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Predictive Delay Propagation Analysis
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-railway-accent/20 text-railway-accent border border-railway-accent/30 font-bold">
              AI Forecast
            </span>
          </div>
          <p className="text-xs text-railway-textSecondary mt-1">
            {etaData.train_id} {etaData.train_name} • Current Location: {etaData.current_location}
          </p>
        </div>

        <button
          onClick={() => loadForecast(id)}
          className="px-3.5 py-1.5 rounded-xl bg-railway-card border border-railway-border text-xs text-white flex items-center gap-2 hover:bg-railway-hover transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Recompute Forecast
        </button>
      </div>

      {/* Main Delay Forecast Progression Card */}
      <DelayForecastCard etaData={etaData} />

      {/* Delay Contributors Panel */}
      <DelayContributorsPanel
        contributors={etaData.delay_contributors}
        totalImpactMinutes={etaData.total_predicted_impact_minutes}
      />

      {/* Station by Station Breakdown Table */}
      <div className="bg-railway-surface/60 rounded-2xl border border-railway-border/80 p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white tracking-tight">
          Section-by-Section Delay Propagation Table
        </h3>
        <p className="text-xs text-railway-textSecondary">
          Demonstrates how sectional travel time deviations compound toward destination {etaData.destination}
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-railway-border text-railway-textMuted uppercase text-[11px]">
                <th className="py-2.5 px-4">Station</th>
                <th className="py-2.5 px-4">Scheduled</th>
                <th className="py-2.5 px-4 text-railway-accent">Predicted</th>
                <th className="py-2.5 px-4">Predicted Delay</th>
                <th className="py-2.5 px-4">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-railway-border/30">
              {etaData.stations.map((st) => (
                <tr key={st.station_code} className="hover:bg-railway-hover/20">
                  <td className="py-3 px-4 font-bold text-white">
                    {st.station_name || st.station_code} ({st.station_code})
                  </td>
                  <td className="py-3 px-4 text-railway-textMuted font-mono">
                    {st.scheduled_eta}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-railway-accent">
                    {st.predicted_eta}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      +{st.delay_minutes} min
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                    {st.confidence_percent}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
