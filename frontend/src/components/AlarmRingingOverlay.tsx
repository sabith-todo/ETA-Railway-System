import React from "react";
import { Bell, Volume2, CheckCircle2, Clock, AlertTriangle, Moon, MapPin } from "lucide-react";
import { useAlarm } from "../context/AlarmContext";

export const AlarmRingingOverlay: React.FC = () => {
  const { isRinging, ringingAlarm, dismissRinging, snooze } = useAlarm();

  if (!isRinging || !ringingAlarm) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      
      {/* Radiant glow effect */}
      <div className="absolute w-96 h-96 bg-railway-accent/30 rounded-full blur-3xl pointer-events-none animate-pulse" />

      <div className="relative z-10 max-w-lg w-full bg-railway-card border-2 border-railway-accent rounded-3xl p-6 sm:p-8 shadow-2xl shadow-railway-accent/40 text-center space-y-6">
        
        {/* Pulsating Bell Badge */}
        <div className="relative inline-flex items-center justify-center">
          <span className="absolute w-24 h-24 rounded-full bg-railway-accent/40 animate-ping" />
          <span className="absolute w-20 h-20 rounded-full bg-amber-500/30 animate-pulse" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-railway-accent via-amber-500 to-railway-gold flex items-center justify-center text-white shadow-xl shadow-railway-accent/50">
            <Bell className="w-8 h-8 animate-bounce" />
          </div>
        </div>

        {/* Alarm Banner & Title */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider animate-pulse">
            <Volume2 className="w-3.5 h-3.5" />
            Station Arrival Alert • Wake Up Now!
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Train Approaching Your Station!
          </h2>
          <p className="text-xs sm:text-sm text-railway-textSecondary">
            Prepare your luggage and get ready to deboard.
          </p>
        </div>

        {/* Station & Train Card */}
        <div className="bg-railway-darkest/90 rounded-2xl border border-railway-border/80 p-4 sm:p-5 text-left space-y-3">
          
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-railway-textMuted tracking-wider block">
                Destination Station:
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <MapPin className="w-4 h-4 text-railway-accent flex-shrink-0" />
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {ringingAlarm.stationName} ({ringingAlarm.stationCode})
                </h3>
              </div>
            </div>

            {/* Platform Pill */}
            <div className="px-3 py-1.5 rounded-xl bg-railway-accent text-white font-extrabold text-sm sm:text-base shadow-lg shadow-railway-accent/30 text-center flex-shrink-0">
              <span className="text-[9px] uppercase tracking-wider block font-normal opacity-80">Platform</span>
              PF {ringingAlarm.platform || "1"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-railway-border/50 text-xs">
            <div>
              <span className="text-railway-textMuted block text-[10px]">Train Service:</span>
              <span className="font-semibold text-white truncate block">
                {ringingAlarm.trainId} • {ringingAlarm.trainName}
              </span>
            </div>

            <div>
              <span className="text-railway-textMuted block text-[10px]">Expected Arrival:</span>
              <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" />
                {ringingAlarm.predictedArrival || ringingAlarm.scheduledArrival}
              </span>
            </div>
          </div>

          {ringingAlarm.leadMinutes > 0 && (
            <div className="bg-railway-surface/60 rounded-xl p-2.5 flex items-center gap-2 text-xs text-railway-textSecondary border border-railway-border/40">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Alarm triggered <strong>{ringingAlarm.leadMinutes} minutes</strong> prior to estimated station arrival.
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={dismissRinging}
            className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-5 h-5" />
            I am Awake (Dismiss Alarm)
          </button>

          <button
            onClick={() => snooze(5)}
            className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-railway-surface hover:bg-railway-hover border border-railway-border text-railway-textSecondary hover:text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Moon className="w-4 h-4 text-blue-400" />
            Snooze 5 Mins
          </button>
        </div>

      </div>

    </div>
  );
};
