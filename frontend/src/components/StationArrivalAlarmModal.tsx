import React, { useState, useEffect } from "react";
import { 
  Bell, Clock, MapPin, Volume2, X, ShieldCheck, 
  CheckCircle2, Trash2, Smartphone, Sparkles, Navigation 
} from "lucide-react";
import { useAlarm } from "../context/AlarmContext";
import { RouteStation } from "../types";

interface StationArrivalAlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: RouteStation[];
  trainNumber: string;
  trainName: string;
  preselectedStationCode?: string;
  currentDelayMin?: number;
}

const LEAD_TIME_OPTIONS = [
  { value: 0, label: "At Arrival (0m prior)", desc: "Triggers exactly as train reaches platform" },
  { value: 5, label: "5 Minutes Prior", desc: "Quick wake-up for light sleepers" },
  { value: 10, label: "10 Minutes Prior", desc: "Collect belongings & move to door" },
  { value: 15, label: "15 Minutes Prior (Recommended)", desc: "Optimal wake-up buffer for Indian Railways" },
  { value: 20, label: "20 Minutes Prior", desc: "Ideal for long journeys / deep sleep" },
  { value: 30, label: "30 Minutes Prior", desc: "Ample preparation & refreshment time" },
  { value: 45, label: "45 Minutes Prior", desc: "Early preparation for terminal stops" },
  { value: 60, label: "1 Hour Prior", desc: "Early morning arrival wakeup" },
];

export const StationArrivalAlarmModal: React.FC<StationArrivalAlarmModalProps> = ({
  isOpen,
  onClose,
  stations,
  trainNumber,
  trainName,
  preselectedStationCode,
  currentDelayMin = 0,
}) => {
  const { activeAlarm, remainingSeconds, setAlarm, cancelAlarm, testSound } = useAlarm();

  // Find valid default station
  const defaultStnCode = preselectedStationCode || (stations.length > 1 ? stations[stations.length - 1].station_code : stations[0]?.station_code || "");
  const [selectedStationCode, setSelectedStationCode] = useState<string>(defaultStnCode);
  const [leadMinutes, setLeadMinutes] = useState<number>(15);
  const [isPlayingTest, setIsPlayingTest] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedStationCode) {
      setSelectedStationCode(preselectedStationCode);
    }
  }, [preselectedStationCode]);

  if (!isOpen) return null;

  const currentStation = stations.find((s) => s.station_code === selectedStationCode) || stations[0];
  const schedTime = currentStation?.scheduled_arrival || currentStation?.scheduled_departure || "--:--";
  const predTime = currentStation?.predicted_arrival || schedTime;
  const platform = currentStation?.platform || "1";

  // Check if active alarm is already set for this train
  const isThisTrainArmed = activeAlarm && activeAlarm.trainId === trainNumber && activeAlarm.isArmed;

  // Calculate estimated alarm trigger time
  const calculateTriggerTimeString = () => {
    if (!predTime || !predTime.includes(":")) return "--:--";
    const [h, m] = predTime.split(":").map(Number);
    let totalMins = h * 60 + m - leadMinutes;
    if (totalMins < 0) totalMins += 24 * 60;
    const trigH = Math.floor(totalMins / 60) % 24;
    const trigM = totalMins % 60;
    return `${String(trigH).padStart(2, "0")}:${String(trigM).padStart(2, "0")}`;
  };

  const handleTestSound = async () => {
    setIsPlayingTest(true);
    await testSound();
    setIsPlayingTest(false);
  };

  const handleArmAlarm = () => {
    if (!currentStation) return;

    setAlarm({
      trainId: trainNumber,
      trainName: trainName,
      stationCode: currentStation.station_code,
      stationName: currentStation.station_name,
      platform: platform,
      scheduledArrival: schedTime,
      predictedArrival: predTime,
      leadMinutes: leadMinutes,
    });

    setSuccessNotice(`Arrival alarm armed for ${currentStation.station_name}!`);
    setTimeout(() => {
      setSuccessNotice(null);
      onClose();
    }, 1200);
  };

  // Format remaining seconds into MM:SS or HH:MM:SS
  const formatCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    return `${m}m ${s < 10 ? `0${s}` : s}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      
      <div className="bg-railway-card border border-railway-border/80 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
        
        {/* Top Glow Accent */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-railway-accent/15 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-railway-accent to-amber-500 flex items-center justify-center text-white shadow-lg shadow-railway-accent/30">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white tracking-tight">
                  Station Arrival Alarm
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Wake-Up Alert
                </span>
              </div>
              <p className="text-xs text-railway-textSecondary mt-0.5">
                {trainNumber} • {trainName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-railway-textMuted hover:text-white hover:bg-railway-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Active Alarm Alert (if already armed) */}
        {isThisTrainArmed && activeAlarm && (
          <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Bell className="w-4 h-4 animate-bounce" />
                Alarm Currently Active
              </div>
              {remainingSeconds !== null && (
                <span className="font-mono text-xs font-extrabold text-white bg-amber-500/30 px-2 py-0.5 rounded border border-amber-500/40">
                  Rings in: {formatCountdown(remainingSeconds)}
                </span>
              )}
            </div>

            <p className="text-xs text-railway-textSecondary">
              Set for <strong>{activeAlarm.stationName}</strong> ({activeAlarm.stationCode}) • {activeAlarm.leadMinutes} mins before arrival.
            </p>

            <button
              onClick={() => {
                cancelAlarm();
                setSuccessNotice("Alarm canceled.");
                setTimeout(() => setSuccessNotice(null), 1000);
              }}
              className="w-full py-2 rounded-xl bg-railway-ruby/20 hover:bg-railway-ruby/30 text-railway-ruby border border-railway-ruby/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Cancel Active Alarm
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="space-y-4 relative z-10">
          
          {/* Station Selection */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-railway-textMuted uppercase tracking-wider">
              Choose Destination Station to Wake Up For:
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-railway-accent absolute left-3 top-3" />
              <select
                value={selectedStationCode}
                onChange={(e) => setSelectedStationCode(e.target.value)}
                className="w-full bg-railway-darkest/90 border border-railway-border rounded-xl pl-9 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-railway-accent font-medium cursor-pointer"
              >
                {stations.map((st, idx) => (
                  <option key={`${st.station_code}_${idx}`} value={st.station_code} className="bg-railway-darkest text-white">
                    {st.station_name} ({st.station_code}) — Arr: {st.predicted_arrival || st.scheduled_arrival} (PF {st.platform || 1})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Station Snapshot Details Card */}
          {currentStation && (
            <div className="bg-railway-darkest/70 border border-railway-border/70 rounded-2xl p-3 sm:p-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-railway-card/80 border border-railway-border/40">
                <span className="text-[10px] text-railway-textMuted uppercase block">Platform</span>
                <span className="font-extrabold text-sm sm:text-base text-railway-accent">
                  PF {platform}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-railway-card/80 border border-railway-border/40">
                <span className="text-[10px] text-railway-textMuted uppercase block">Scheduled</span>
                <span className="font-mono font-bold text-white text-xs sm:text-sm">
                  {schedTime}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-railway-card/80 border border-railway-border/40">
                <span className="text-[10px] text-railway-textMuted uppercase block">Dynamic ETA</span>
                <span className={`font-mono font-bold text-xs sm:text-sm ${currentDelayMin > 5 ? "text-amber-400" : "text-emerald-400"}`}>
                  {predTime}
                </span>
              </div>
            </div>
          )}

          {/* Advance Notice Lead Time Selector */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-railway-textMuted uppercase tracking-wider">
              Trigger Wake-Up Alarm Before Arrival:
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
              {LEAD_TIME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLeadMinutes(opt.value)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    leadMinutes === opt.value
                      ? "bg-railway-accent text-white border-railway-accent shadow-md shadow-railway-accent/25"
                      : "bg-railway-darkest/70 border-railway-border text-railway-textSecondary hover:text-white hover:border-railway-border/80"
                  }`}
                >
                  <span className="font-bold text-xs block leading-tight">{opt.label}</span>
                  <span className={`text-[10px] block mt-0.5 leading-tight ${leadMinutes === opt.value ? "text-white/80" : "text-railway-textMuted"}`}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Exact Ring Calculation */}
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div>
                <span className="text-white font-bold block">
                  Alarm will ring at: <strong className="font-mono text-emerald-400 text-sm">{calculateTriggerTimeString()}</strong>
                </span>
                <span className="text-[11px] text-railway-textSecondary">
                  Adjusts dynamically if train delay changes en route
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestSound}
              className="px-2.5 py-1.5 rounded-xl bg-railway-card border border-railway-border/80 text-[11px] font-semibold text-railway-textSecondary hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isPlayingTest ? "text-amber-400 animate-spin" : "text-railway-accent"}`} />
              Test Chime
            </button>
          </div>

        </div>

        {/* Success Banner */}
        {successNotice && (
          <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {successNotice}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-railway-surface hover:bg-railway-hover border border-railway-border text-xs font-semibold text-railway-textSecondary hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleArmAlarm}
            className="flex-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-railway-accent to-amber-600 hover:from-railway-accentHover hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-railway-accent/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Bell className="w-4 h-4" />
            Arm Arrival Alarm ({leadMinutes}m before)
          </button>
        </div>

      </div>

    </div>
  );
};
