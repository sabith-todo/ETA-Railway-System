import React from "react";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { DynamicETAResponse } from "../types";

interface DelayForecastCardProps {
  etaData: DynamicETAResponse;
}

export const DelayForecastCard: React.FC<DelayForecastCardProps> = ({ etaData }) => {
  const currentDelay = etaData.current_delay_minutes;
  const predictedDestDelay = etaData.predicted_destination_delay_minutes;
  const additionalDelay = etaData.expected_additional_delay_minutes;
  const recovery = etaData.recovery_info;

  // Chart data: Station -> Predicted Delay
  const chartData = [
    {
      station: "Current",
      delay: currentDelay,
      scheduled: 0,
      name: etaData.current_location
    },
    ...etaData.stations.map((st) => ({
      station: st.station_code,
      delay: st.delay_minutes,
      name: st.station_name || st.station_code,
      predicted: st.predicted_eta
    }))
  ];

  const isDelayIncreasing = predictedDestDelay > currentDelay;
  const isRecovering = recovery?.is_recovering;

  return (
    <div className="bg-railway-surface/60 rounded-2xl border border-railway-border/80 p-6 shadow-xl space-y-6">
      
      {/* Title & Recovery Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-railway-accent" />
            Delay Forecast & Propagation Trajectory
          </h3>
          <p className="text-xs text-railway-textSecondary mt-0.5">
            Predictive modeling of how sectional headway and restrictions compound or dissipate
          </p>
        </div>

        {/* Recovery Tendency Pill */}
        <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
          isRecovering 
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            : isDelayIncreasing
            ? "bg-red-500/10 text-red-400 border-red-500/30"
            : "bg-blue-500/10 text-blue-400 border-blue-500/30"
        }`}>
          {isRecovering ? (
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          ) : isDelayIncreasing ? (
            <TrendingUp className="w-4 h-4 text-red-400" />
          ) : (
            <Minus className="w-4 h-4 text-blue-400" />
          )}
          <span>{recovery?.status_text || "Delay profile stable"}</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Current Delay */}
        <div className="p-4 rounded-xl bg-railway-dark/60 border border-railway-border">
          <span className="text-xs text-railway-textMuted uppercase font-semibold tracking-wider">
            Current Delay Now
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono font-bold text-white">
              +{currentDelay}
            </span>
            <span className="text-xs text-railway-textSecondary">minutes</span>
          </div>
          <p className="text-[11px] text-railway-textMuted mt-1">
            At {etaData.current_location}
          </p>
        </div>

        {/* Predicted Dest Delay */}
        <div className="p-4 rounded-xl bg-railway-dark/60 border border-railway-accent/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-railway-accent/10 rounded-full blur-xl pointer-events-none" />
          <span className="text-xs text-railway-accent uppercase font-bold tracking-wider">
            Predicted Destination Delay
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-mono font-bold text-railway-accent">
              +{predictedDestDelay}
            </span>
            <span className="text-xs text-railway-textSecondary">minutes</span>
          </div>
          <p className="text-[11px] text-railway-textMuted mt-1">
            Expected ETA at {etaData.destination}: <strong className="text-white font-mono">{etaData.predicted_eta}</strong>
          </p>
        </div>

        {/* Delta change */}
        <div className="p-4 rounded-xl bg-railway-dark/60 border border-railway-border">
          <span className="text-xs text-railway-textMuted uppercase font-semibold tracking-wider">
            Net Forecasted Delta
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-mono font-bold ${
              additionalDelay > 0 ? "text-amber-400" : "text-emerald-400"
            }`}>
              {additionalDelay > 0 ? `+${additionalDelay}` : "0"}
            </span>
            <span className="text-xs text-railway-textSecondary">min additional</span>
          </div>
          <p className="text-[11px] text-railway-textMuted mt-1">
            {additionalDelay > 0 
              ? "Expected downstream congestion accumulation" 
              : "Maintaining current schedule slack"}
          </p>
        </div>
      </div>

      {/* Propagation Chart */}
      <div className="bg-railway-darkest/50 p-4 rounded-xl border border-railway-border/60">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-white tracking-wide uppercase">
            Station → Predicted Delay Propagation Curve
          </span>
          <span className="text-[11px] font-mono text-railway-textMuted">
            X-Axis: Stations | Y-Axis: Delay (Minutes)
          </span>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="delayGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6500" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#FF6500" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F3A5E" opacity={0.4} />
              <XAxis 
                dataKey="station" 
                stroke="#64748B" 
                fontSize={11} 
                tickLine={false}
              />
              <YAxis 
                stroke="#64748B" 
                fontSize={11} 
                tickLine={false}
                unit="m"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "#112238", 
                  borderColor: "#1F3A5E", 
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                  color: "#F8FAFC"
                }}
                formatter={(value: any) => [`+${value} min`, "Predicted Delay"]}
                labelFormatter={(label, payload) => {
                  const item = payload && payload[0]?.payload;
                  return item ? `${item.name} (${label})` : label;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="delay" 
                stroke="#FF6500" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#delayGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
