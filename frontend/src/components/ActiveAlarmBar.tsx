import React from "react";
import { Link } from "react-router-dom";
import { Bell, X, Clock } from "lucide-react";
import { useAlarm } from "../context/AlarmContext";

export const ActiveAlarmBar: React.FC = () => {
  const { activeAlarm, remainingSeconds, cancelAlarm } = useAlarm();

  if (!activeAlarm || !activeAlarm.isArmed) return null;

  const formatCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s < 10 ? `0${s}` : s}s`;
  };

  return (
    <aside aria-label="Active Train Arrival Alarm" className="bg-gradient-to-r from-amber-600/95 via-orange-600/95 to-amber-700/95 text-white px-3 sm:px-4 py-2 text-xs shadow-lg sticky top-16 z-40 backdrop-blur-md border-b border-amber-400/40 animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2.5 max-w-7xl mx-auto w-full justify-between">
        <div className="flex items-center gap-2 truncate">
          <Bell className="w-4 h-4 animate-bounce flex-shrink-0 text-amber-200" />
          <span className="font-bold tracking-tight truncate">
            Arrival Alarm Active: Train {activeAlarm.trainId} approaching {activeAlarm.stationName} ({activeAlarm.stationCode})
          </span>
          <span className="text-amber-100 hidden sm:inline">
            • PF {activeAlarm.platform} • Arr: {activeAlarm.predictedArrival}
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          {remainingSeconds !== null && (
            <span className="font-mono font-extrabold bg-black/30 px-2 py-0.5 rounded border border-white/20 text-amber-100 flex items-center gap-1 text-[11px] sm:text-xs">
              <Clock className="w-3 h-3" />
              {formatCountdown(remainingSeconds)}
            </span>
          )}

          <Link
            to={`/train/${activeAlarm.trainId}`}
            className="underline text-[11px] font-bold text-white hover:text-amber-200"
          >
            Track Train
          </Link>

          <button
            onClick={cancelAlarm}
            className="p-1 rounded-lg hover:bg-black/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Cancel alarm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
