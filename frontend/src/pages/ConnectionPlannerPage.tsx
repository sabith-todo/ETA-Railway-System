import React, { useState, useEffect } from "react";
import { 
  GitMerge, 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  ShieldAlert, 
  MapPin, 
  Zap,
  Info
} from "lucide-react";
import { 
  checkConnectionRisk, 
  fetchTransferStations, 
  fetchPopularConnections, 
  fetchTrainList 
} from "../services/api";
import { 
  ConnectionCheckResult, 
  TransferStationInfo, 
  PopularConnectionPair, 
  Train 
} from "../types";

export const ConnectionPlannerPage: React.FC = () => {
  const [arrivingTrain, setArrivingTrain] = useState("12627");
  const [connectingTrain, setConnectingTrain] = useState("12675");
  const [transferStation, setTransferStation] = useState("SA");
  const [bufferMin, setBufferMin] = useState(15);
  
  const [availableStations, setAvailableStations] = useState<TransferStationInfo[]>([]);
  const [popularPresets, setPopularPresets] = useState<PopularConnectionPair[]>([]);
  const [trainList, setTrainList] = useState<Train[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [noCommonStations, setNoCommonStations] = useState(false);

  const [result, setResult] = useState<ConnectionCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load popular presets and active trains on mount
  useEffect(() => {
    fetchPopularConnections()
      .then((presets) => setPopularPresets(presets))
      .catch((err) => console.warn("Could not load presets:", err));

    fetchTrainList()
      .then((data) => {
        if (data && data.trains) setTrainList(data.trains);
      })
      .catch((err) => console.warn("Could not load trains:", err));
  }, []);

  // Whenever arrivingTrain or connectingTrain changes, fetch shared transfer stations
  useEffect(() => {
    if (!arrivingTrain.trim() || !connectingTrain.trim()) {
      setAvailableStations([]);
      setNoCommonStations(false);
      return;
    }

    setStationsLoading(true);
    setNoCommonStations(false);

    fetchTransferStations(arrivingTrain.trim(), connectingTrain.trim())
      .then((stations) => {
        setAvailableStations(stations);
        if (stations.length > 0) {
          // If current station is already valid, preserve it; otherwise auto-select the first one
          setTransferStation((prev) => {
            const hasCurrent = stations.some((s: TransferStationInfo) => s.station_code === prev);
            return hasCurrent ? prev : stations[0].station_code;
          });
          setNoCommonStations(false);
        } else {
          setNoCommonStations(true);
        }
      })
      .catch(() => {
        setAvailableStations([]);
        setNoCommonStations(true);
      })
      .finally(() => {
        setStationsLoading(false);
      });
  }, [arrivingTrain, connectingTrain]);

  // Handle preset selection
  const handleSelectPreset = (preset: PopularConnectionPair) => {
    setArrivingTrain(preset.arriving_train_id);
    setConnectingTrain(preset.connecting_train_id);
    setTransferStation(preset.transfer_station_code);
    setError(null);

    // Auto-evaluate preset
    runEvaluation(preset.arriving_train_id, preset.connecting_train_id, preset.transfer_station_code, bufferMin);
  };

  const runEvaluation = async (arrId: string, connId: string, stCode: string, minBuf: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkConnectionRisk({
        arriving_train_id: arrId.trim(),
        connecting_train_id: connId.trim(),
        transfer_station_code: stCode.trim().toUpperCase(),
        minimum_buffer_minutes: Number(minBuf)
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to evaluate connection feasibility.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = (e: React.FormEvent) => {
    e.preventDefault();
    runEvaluation(arrivingTrain, connectingTrain, transferStation, bufferMin);
  };

  // Find train details for labels
  const incomingTrainObj = trainList.find((t) => t.number === arrivingTrain.trim());
  const connectingTrainObj = trainList.find((t) => t.number === connectingTrain.trim());

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-railway-darkest via-railway-surface to-railway-darkest border border-railway-border/60 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-railway-accent/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -bottom-10 w-48 h-48 bg-railway-gold/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-railway-accent to-railway-gold flex items-center justify-center shadow-lg shadow-railway-accent/25">
                <GitMerge className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Inter-Train Connection Risk Analyzer
                </h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-railway-accent/15 text-railway-accent border border-railway-accent/30 font-bold uppercase tracking-wider">
                    Dynamic AI vs Static Timetable
                  </span>
                  <span className="text-xs text-railway-textMuted">
                    Problem Statement 26028
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-railway-textSecondary mt-3 max-w-2xl leading-relaxed">
              Unlike static timetable schedules that give passengers a false sense of security, this engine continuously evaluates 
              <strong> real-time physics, live section telemetry, and compounding downstream delays</strong> to forecast whether your connecting rake will actually be caught or missed.
            </p>
          </div>
        </div>

        {/* Popular Showcase Presets */}
        {popularPresets.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <div className="flex items-center gap-2 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-railway-gold animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-railway-gold">
                Live Showcase Scenarios (1-Click Test):
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {popularPresets.map((p) => {
                const isSelected = 
                  arrivingTrain === p.arriving_train_id && 
                  connectingTrain === p.connecting_train_id && 
                  transferStation === p.transfer_station_code;

                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p)}
                    className={`text-left p-3 rounded-xl border transition-all text-xs group ${
                      isSelected
                        ? "bg-railway-accent/20 border-railway-accent text-white shadow-md shadow-railway-accent/20"
                        : "bg-railway-dark/60 border-railway-border/60 hover:border-railway-accent/50 text-railway-textSecondary hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold text-[11px] text-railway-accent group-hover:text-railway-gold transition-colors">
                      <span>{p.arriving_train_id} ➔ {p.connecting_train_id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white">
                        {p.transfer_station_code}
                      </span>
                    </div>
                    <div className="font-semibold text-white mt-1 truncate">{p.title}</div>
                    <div className="text-[10px] text-railway-textMuted mt-0.5 truncate">{p.transfer_station_name}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Connection Formulation Form */}
      <div className="bg-railway-surface/90 rounded-2xl border border-railway-border p-6 shadow-xl space-y-6">
        <form onSubmit={handleEvaluate} className="space-y-5">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Incoming Train */}
            <div>
              <label className="block text-[11px] font-bold text-railway-textMuted uppercase tracking-wider mb-1.5">
                Incoming Train No.
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={arrivingTrain}
                  onChange={(e) => setArrivingTrain(e.target.value)}
                  placeholder="e.g. 12627"
                  className="w-full bg-railway-darkest/90 border border-railway-border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-railway-accent transition-all"
                  required
                />
              </div>
              {incomingTrainObj && (
                <div className="mt-1.5 text-[11px] text-railway-accent flex items-center justify-between">
                  <span className="font-semibold truncate">{incomingTrainObj.name}</span>
                  <span className="text-[10px] text-railway-textMuted font-mono">
                    {incomingTrainObj.origin} ➔ {incomingTrainObj.destination}
                  </span>
                </div>
              )}
            </div>

            {/* Connecting Train */}
            <div>
              <label className="block text-[11px] font-bold text-railway-textMuted uppercase tracking-wider mb-1.5">
                Connecting Train No.
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={connectingTrain}
                  onChange={(e) => setConnectingTrain(e.target.value)}
                  placeholder="e.g. 12675"
                  className="w-full bg-railway-darkest/90 border border-railway-border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-railway-accent transition-all"
                  required
                />
              </div>
              {connectingTrainObj && (
                <div className="mt-1.5 text-[11px] text-railway-gold flex items-center justify-between">
                  <span className="font-semibold truncate">{connectingTrainObj.name}</span>
                  <span className="text-[10px] text-railway-textMuted font-mono">
                    {connectingTrainObj.origin} ➔ {connectingTrainObj.destination}
                  </span>
                </div>
              )}
            </div>

            {/* Transfer Station Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-railway-textMuted uppercase tracking-wider">
                  Transfer Station
                </label>
                {stationsLoading && (
                  <span className="text-[10px] text-railway-accent animate-pulse">Finding shared stops...</span>
                )}
              </div>
              
              {availableStations.length > 0 ? (
                <select
                  value={transferStation}
                  onChange={(e) => setTransferStation(e.target.value)}
                  className="w-full bg-railway-darkest/90 border border-railway-border rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-railway-accent transition-all cursor-pointer"
                >
                  {availableStations.map((st) => (
                    <option key={st.station_code} value={st.station_code} className="bg-railway-dark text-white">
                      {st.station_code} - {st.station_name} ({st.city})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={transferStation}
                  onChange={(e) => setTransferStation(e.target.value.toUpperCase())}
                  placeholder="e.g. SA, ED, KPD"
                  className="w-full bg-railway-darkest/90 border border-railway-border rounded-xl px-3.5 py-2.5 text-sm text-white uppercase font-mono focus:outline-none focus:border-railway-accent transition-all"
                  required
                />
              )}
              
              {noCommonStations && (
                <p className="mt-1.5 text-[11px] text-red-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 inline flex-shrink-0" />
                  These trains do not share any common stations.
                </p>
              )}
            </div>

          </div>

          {/* Buffer Minutes Selector & Submit */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5">
            <div className="flex items-center gap-3">
              <label className="text-[11px] font-bold text-railway-textMuted uppercase tracking-wider whitespace-nowrap">
                Min. Platform Buffer:
              </label>
              <div className="flex items-center gap-1.5">
                {[10, 15, 20, 30].map((mins) => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => setBufferMin(mins)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                      bufferMin === mins
                        ? "bg-railway-accent text-white shadow-md shadow-railway-accent/30"
                        : "bg-railway-darkest/60 border border-railway-border text-railway-textMuted hover:text-white"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || noCommonStations}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-railway-accent to-railway-gold hover:from-railway-accentHover hover:to-railway-accent text-white font-bold text-xs shadow-lg shadow-railway-accent/25 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4 text-white" />
              {loading ? "Analyzing Dynamic Risk..." : "Evaluate Connection Feasibility"}
            </button>
          </div>

        </form>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 animate-shake">
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="leading-relaxed">
            <strong className="block font-bold">Evaluation Blocked</strong>
            {error}
          </div>
        </div>
      )}

      {/* Evaluation Results Card */}
      {result && (
        <div className={`rounded-3xl border shadow-2xl p-6 sm:p-8 space-y-6 animate-slide-in transition-all ${
          result.status === "Likely"
            ? "bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/10"
            : result.status === "Moderate Risk"
            ? "bg-amber-500/10 border-amber-500/40 shadow-amber-500/10"
            : result.status === "At Risk"
            ? "bg-red-500/10 border-red-500/40 shadow-red-500/10"
            : "bg-rose-950/40 border-rose-600/50 shadow-rose-600/10"
        }`}>
          
          {/* Header Assessment */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-railway-accent" />
                <span className="text-xs font-bold uppercase tracking-wider text-railway-textMuted">
                  Interchange Station: {result.transfer_station_name || result.transfer_station} ({result.transfer_station})
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-2">
                {result.status === "Likely" ? (
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                ) : result.status === "Moderate Risk" ? (
                  <AlertTriangle className="w-7 h-7 text-amber-400" />
                ) : (
                  <XCircle className="w-7 h-7 text-red-400" />
                )}
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {result.status === "Likely" && "Connection Likely"}
                    {result.status === "Moderate Risk" && "Moderate Risk (Tight Window)"}
                    {result.status === "At Risk" && "Connection At Risk (Miss Expected)"}
                    {result.status === "Missed" && "Connection Missed"}
                  </h2>
                  <p className="text-xs text-railway-textSecondary mt-0.5">
                    Required Platform Buffer: {bufferMin} minutes • Margin: {result.buffer_margin_minutes > 0 ? `+${result.buffer_margin_minutes}m` : `${result.buffer_margin_minutes}m`}
                  </p>
                </div>
              </div>
            </div>

            {/* Transfer Window Highlight */}
            <div className="bg-railway-darkest/70 border border-white/10 rounded-2xl p-4 text-right sm:min-w-[200px]">
              <span className="text-[10px] uppercase font-bold text-railway-textMuted block tracking-wider">
                Live Available Window
              </span>
              <div className="flex items-baseline justify-end gap-1.5 mt-1">
                <span className={`text-3xl font-mono font-black ${
                  result.available_transfer_minutes >= bufferMin + 10
                    ? "text-emerald-400"
                    : result.available_transfer_minutes >= bufferMin
                    ? "text-amber-400"
                    : "text-red-400"
                }`}>
                  {result.available_transfer_minutes}
                </span>
                <span className="text-xs font-bold text-white">mins</span>
              </div>
              <span className="text-[11px] text-railway-textMuted block mt-0.5">
                Timetable had: <strong className="text-white font-mono">{result.scheduled_transfer_minutes || 38}m</strong>
              </span>
            </div>
          </div>

          {/* Side-by-Side Train Telemetry Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Arriving Train Card */}
            <div className="p-5 rounded-2xl bg-railway-dark/70 border border-railway-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-railway-textMuted">
                  Incoming Train
                </span>
                {result.platform_arriving && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-railway-accent/15 text-railway-accent border border-railway-accent/30 font-mono font-bold">
                    Platform {result.platform_arriving}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  <span className="font-mono text-railway-accent mr-1.5">{result.arriving_train_id}</span>
                  {result.arriving_train_name}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                <div>
                  <span className="text-railway-textMuted block text-[10px] uppercase font-semibold">Scheduled Arrival</span>
                  <span className="font-mono text-white text-sm font-semibold">{result.scheduled_arrival_time || "--:--"}</span>
                </div>
                <div>
                  <span className="text-railway-textMuted block text-[10px] uppercase font-semibold">AI Dynamic Arrival</span>
                  <span className="font-mono font-bold text-railway-accent text-sm">{result.predicted_arrival_time}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 text-railway-textSecondary">
                <span>Delay Impact: <strong className="text-amber-400 font-mono">+{result.arriving_delay_minutes || 0} min</strong></span>
                {result.arriving_confidence_percent && (
                  <span>Confidence: <strong className="text-emerald-400 font-mono">{result.arriving_confidence_percent}%</strong></span>
                )}
              </div>
            </div>

            {/* Connecting Train Card */}
            <div className="p-5 rounded-2xl bg-railway-dark/70 border border-railway-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-railway-textMuted">
                  Connecting Train
                </span>
                {result.platform_connecting && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-railway-gold/15 text-railway-gold border border-railway-gold/30 font-mono font-bold">
                    Platform {result.platform_connecting}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  <span className="font-mono text-railway-gold mr-1.5">{result.connecting_train_id}</span>
                  {result.connecting_train_name}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                <div>
                  <span className="text-railway-textMuted block text-[10px] uppercase font-semibold">Scheduled Departure</span>
                  <span className="font-mono text-white text-sm font-semibold">{result.scheduled_departure_time}</span>
                </div>
                <div>
                  <span className="text-railway-textMuted block text-[10px] uppercase font-semibold">Live Dynamic Departure</span>
                  <span className="font-mono font-bold text-railway-gold text-sm">{result.predicted_departure_time || result.scheduled_departure_time}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1 text-railway-textSecondary">
                <span>Connecting Delay: <strong className="text-white font-mono">+{result.connecting_delay_minutes || 0} min</strong></span>
                {result.connecting_confidence_percent && (
                  <span>Confidence: <strong className="text-emerald-400 font-mono">{result.connecting_confidence_percent}%</strong></span>
                )}
              </div>
            </div>

          </div>

          {/* Platform Interchange & Buffer Analysis */}
          <div className="p-4 rounded-2xl bg-railway-darkest/60 border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between text-xs font-semibold text-railway-textSecondary gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-railway-accent" />
                <span>Buffer Comparison:</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span>Timetable Window: <strong className="text-white">{result.scheduled_transfer_minutes || 38}m</strong></span>
                <span>Delay Erosion: <strong className="text-red-400">-{result.arriving_delay_minutes || 0}m</strong></span>
                <span>Live Window: <strong className="text-emerald-400">{result.available_transfer_minutes}m</strong></span>
              </div>
            </div>

            {/* Visual Transfer Gauge Bar */}
            <div className="w-full bg-railway-darkest rounded-full h-3 border border-white/10 overflow-hidden flex">
              <div 
                className="bg-railway-accent h-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, (result.available_transfer_minutes / (result.scheduled_transfer_minutes || 45)) * 100))}%` }}
              />
              <div 
                className="bg-red-500/40 h-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(0, ((result.arriving_delay_minutes || 0) / (result.scheduled_transfer_minutes || 45)) * 100))}%` }}
              />
            </div>
            
            {result.platform_arriving && result.platform_connecting && (
              <div className="text-[11px] text-railway-textMuted flex items-center gap-1.5 pt-1">
                <Info className="w-3.5 h-3.5 text-railway-accent flex-shrink-0" />
                <span>
                  Interchange: <strong>Platform {result.platform_arriving}</strong> <ArrowRight className="w-3 h-3 inline mx-1" /> <strong>Platform {result.platform_connecting}</strong> 
                  {result.cross_platform_transfer ? " (Same island platform cross-transfer)" : " (Overbridge / Subway crossing required, budget ~4 min)"}.
                </span>
              </div>
            )}
          </div>

          {/* Operational Recommendation */}
          <div className="p-4 rounded-2xl bg-railway-darkest/90 border border-white/10 text-xs text-railway-textSecondary leading-relaxed flex items-start gap-3">
            <Zap className="w-4 h-4 text-railway-gold mt-0.5 flex-shrink-0" />
            <div>
              <strong className="text-white block font-bold mb-0.5">AI Controller Recommendation</strong>
              {result.recommendation}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

