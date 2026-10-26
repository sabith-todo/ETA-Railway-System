import React, { useState, useEffect } from "react";
import { 
  Train, MapPin, Search, Compass, Info, CheckCircle2, 
  ArrowRight, ShieldCheck, Zap, Layers, Sparkles, Navigation, X
} from "lucide-react";
import { fetchTrainCoaches } from "../services/api";

interface CoachItem {
  position: number;
  code: string;
  name: string;
  category: string;
  class_code: string;
  total_berths: number;
  layout_type: string;
  distance_from_engine_m: number;
  platform_section: string;
  amenities: string[];
}

interface CoachRakeData {
  train_number: string;
  train_name: string;
  train_type: string;
  origin: string;
  destination: string;
  platform: string;
  total_coaches: number;
  total_length_meters: number;
  engine_position: string;
  rake_type: string;
  coaches: CoachItem[];
}

interface CoachPositionViewerProps {
  trainNumber?: string;
  trainName?: string;
  currentStationCode?: string;
  platformNumber?: string;
}

export const CoachPositionViewer: React.FC<CoachPositionViewerProps> = ({
  trainNumber = "12635",
  trainName = "Vaigai Superfast Express",
  currentStationCode,
  platformNumber,
}) => {
  const [activeTrainNum, setActiveTrainNum] = useState<string>(trainNumber);
  const [inputNum, setInputNum] = useState<string>(trainNumber);
  const [rakeData, setRakeData] = useState<CoachRakeData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected coach for seat matrix modal
  const [selectedCoach, setSelectedCoach] = useState<CoachItem | null>(null);
  const [searchedSeatNum, setSearchedSeatNum] = useState<string>("");

  useEffect(() => {
    setActiveTrainNum(trainNumber);
    setInputNum(trainNumber);
  }, [trainNumber]);

  useEffect(() => {
    if (!activeTrainNum) return;
    setLoading(true);
    setError(null);

    fetchTrainCoaches(activeTrainNum, currentStationCode)
      .then((data) => {
        setRakeData(data);
        if (data.coaches && data.coaches.length > 0) {
          // Preselect first passenger coach (e.g. S1 or B1 or C1)
          const firstPassenger = data.coaches.find((c: CoachItem) => c.category !== "loco" && c.category !== "slr") || data.coaches[0];
          setSelectedCoach(firstPassenger);
        }
      })
      .catch((err) => {
        console.error("Failed to load coach layout:", err);
        setError("Coach layout unavailable for this train.");
      })
      .finally(() => setLoading(false));
  }, [activeTrainNum, currentStationCode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputNum.trim()) {
      setActiveTrainNum(inputNum.trim());
    }
  };

  // Color mapping based on coach category
  const getCoachColor = (category: string) => {
    switch (category) {
      case "ac1":
        return "bg-gradient-to-b from-amber-500/20 to-amber-600/30 border-amber-500/60 text-amber-300";
      case "ac2":
        return "bg-gradient-to-b from-rose-500/20 to-rose-600/30 border-rose-500/60 text-rose-300";
      case "ac3":
        return "bg-gradient-to-b from-sky-500/20 to-sky-600/30 border-sky-500/60 text-sky-300";
      case "sleeper":
        return "bg-gradient-to-b from-emerald-500/20 to-emerald-600/30 border-emerald-500/60 text-emerald-300";
      case "chaircar":
        return "bg-gradient-to-b from-indigo-500/20 to-indigo-600/30 border-indigo-500/60 text-indigo-300";
      case "executive":
        return "bg-gradient-to-b from-purple-500/20 to-purple-600/30 border-purple-500/60 text-purple-300";
      case "general":
        return "bg-gradient-to-b from-yellow-500/20 to-yellow-600/30 border-yellow-500/60 text-yellow-300";
      case "pantry":
        return "bg-gradient-to-b from-orange-500/20 to-orange-600/30 border-orange-500/60 text-orange-300";
      case "loco":
        return "bg-gradient-to-b from-slate-600/40 to-slate-700/60 border-slate-500 text-slate-200";
      default:
        return "bg-railway-card border-railway-border text-railway-textSecondary";
    }
  };

  // Helper for computing berth type of any seat number in 8-berth layout
  const getBerthType8 = (seatNum: number) => {
    const mod = seatNum % 8;
    if (mod === 1 || mod === 4) return { type: "Lower Berth", code: "LB", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
    if (mod === 2 || mod === 5) return { type: "Middle Berth", code: "MB", bg: "bg-sky-500/20 text-sky-300 border-sky-500/40" };
    if (mod === 3 || mod === 6) return { type: "Upper Berth", code: "UB", bg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" };
    if (mod === 7) return { type: "Side Lower", code: "SL", bg: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
    return { type: "Side Upper", code: "SU", bg: "bg-orange-500/20 text-orange-300 border-orange-500/40" };
  };

  // Helper for computing berth type in 6-berth AC 2-Tier layout
  const getBerthType6 = (seatNum: number) => {
    const mod = seatNum % 6;
    if (mod === 1 || mod === 3) return { type: "Lower Berth", code: "LB", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
    if (mod === 2 || mod === 4) return { type: "Upper Berth", code: "UB", bg: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" };
    if (mod === 5) return { type: "Side Lower", code: "SL", bg: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
    return { type: "Side Upper", code: "SU", bg: "bg-orange-500/20 text-orange-300 border-orange-500/40" };
  };

  const searchedSeatParsed = parseInt(searchedSeatNum, 10);
  const isValidSearchedSeat = !isNaN(searchedSeatParsed) && searchedSeatParsed > 0;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-railway-dark to-railway-card rounded-2xl border border-railway-border/80 p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-railway-accent/15 text-railway-accent border border-railway-accent/30">
                <Train className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Train Coach Position & Rake Layout
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    Live Platform Alignment
                  </span>
                </h2>
                <p className="text-xs text-railway-textSecondary">
                  {rakeData ? `${rakeData.train_number} • ${rakeData.train_name} (${rakeData.rake_type})` : trainName}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Train Switcher Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-railway-textMuted absolute left-3 top-2.5" />
              <input
                type="text"
                value={inputNum}
                onChange={(e) => setInputNum(e.target.value)}
                placeholder="Train No. (e.g. 12635)"
                className="w-36 sm:w-44 bg-railway-darkest border border-railway-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-railway-accent font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-railway-accent hover:bg-railway-accentHover text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Lookup
            </button>
          </form>
        </div>

        {/* Platform & Length Key Badges */}
        {rakeData && (
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-railway-border/50 text-xs text-railway-textMuted">
            <span className="flex items-center gap-1.5 font-bold text-railway-accent bg-railway-accent/10 px-2.5 py-1 rounded-lg border border-railway-accent/20">
              <MapPin className="w-3.5 h-3.5" />
              Platform: <strong>PF {platformNumber || rakeData.platform || "1"}</strong>
            </span>
            <span className="text-white">
              Total Rake: <strong>{rakeData.total_coaches} Coaches</strong>
            </span>
            <span>•</span>
            <span className="text-railway-textSecondary">
              Length: <strong>~{rakeData.total_length_meters} meters</strong>
            </span>
            <span>•</span>
            <span className="text-emerald-400 font-medium">
              Engine Facing: <strong>Front (towards {rakeData.destination})</strong>
            </span>
          </div>
        )}
      </div>

      {loading && (
        <div className="p-12 text-center text-railway-textSecondary space-y-2">
          <div className="w-8 h-8 border-2 border-railway-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono">Generating authentic train rake composition...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 text-center text-red-400 bg-red-500/10 rounded-2xl border border-red-500/30 text-xs">
          {error}
        </div>
      )}

      {!loading && rakeData && (
        <div className="space-y-6">
          
          {/* Platform Indicator Strip */}
          <div className="bg-railway-surface/60 rounded-2xl border border-railway-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-railway-textMuted">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <Navigation className="w-4 h-4 rotate-90" />
                FRONT / ENGINE DIRECTION
              </span>
              <span className="font-semibold text-railway-textSecondary bg-railway-darkest px-3 py-1 rounded-full border border-railway-border/60">
                🚉 PLATFORM {platformNumber || rakeData.platform || "1"} (Center Foot Overbridge / Escalator)
              </span>
              <span className="font-bold text-railway-textMuted">
                REAR / GUARD VAN ➔
              </span>
            </div>

            {/* Horizontal Scrollable Train Rake */}
            <div className="overflow-x-auto pb-3 pt-2 scrollbar-thin scrollbar-thumb-railway-accent/40 scrollbar-track-railway-darkest">
              <div className="inline-flex items-center gap-2 min-w-max px-1">
                {rakeData.coaches.map((coach) => {
                  const isSelected = selectedCoach?.code === coach.code;
                  const colorClass = getCoachColor(coach.category);

                  return (
                    <button
                      key={`${coach.code}_${coach.position}`}
                      onClick={() => setSelectedCoach(coach)}
                      className={`relative flex flex-col items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer select-none group min-w-[76px] h-24 ${colorClass} ${
                        isSelected 
                          ? "ring-2 ring-white scale-105 shadow-xl shadow-railway-accent/20 z-10" 
                          : "opacity-90 hover:opacity-100 hover:scale-102"
                      }`}
                    >
                      {/* Position Pill */}
                      <span className="text-[9px] font-mono font-bold text-white/70 block">
                        #{coach.position}
                      </span>

                      {/* Coach Code Name */}
                      <span className="font-mono font-extrabold text-base tracking-tight text-white block">
                        {coach.code}
                      </span>

                      {/* Class / Berths */}
                      <span className="text-[10px] font-bold text-white/90 block truncate max-w-[70px]">
                        {coach.class_code || coach.category}
                      </span>

                      {/* Active Indicator Arrow */}
                      {isSelected && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-white" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Platform Reference Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] pt-1 text-railway-textMuted border-t border-railway-border/30">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white font-semibold">Coach Classes:</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">1A (First AC)</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">2A (2-Tier AC)</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">3A (3-Tier AC)</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">SL (Sleeper)</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">CC (Chair Car)</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">GEN (Unreserved)</span>
              </div>

              <span className="text-railway-textSecondary font-mono">
                Click any coach to view full berth & seat layout
              </span>
            </div>
          </div>

          {/* Detailed Coach Inspector & Seat Finder */}
          {selectedCoach && (
            <div className="bg-railway-card/80 border border-railway-border/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
              
              {/* Coach Title Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-railway-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-railway-accent/20 border border-railway-accent/40 flex items-center justify-center font-mono font-extrabold text-xl text-railway-accent">
                    {selectedCoach.code}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white">
                      Coach {selectedCoach.code} — {selectedCoach.name}
                    </h3>
                    <p className="text-xs text-railway-textSecondary flex items-center gap-2">
                      <span>Position #{selectedCoach.position} in train</span>
                      <span>•</span>
                      <span>Platform: {selectedCoach.platform_section} (~{selectedCoach.distance_from_engine_m}m from Engine)</span>
                      <span>•</span>
                      <span>Total Berths: <strong>{selectedCoach.total_berths || "Unreserved"}</strong></span>
                    </p>
                  </div>
                </div>

                {/* Amenities Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedCoach.amenities.map((am, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-lg bg-railway-darkest text-railway-textMuted border border-railway-border">
                      {am}
                    </span>
                  ))}
                </div>
              </div>

              {/* Seat / Berth Finder Search Bar */}
              {selectedCoach.total_berths > 0 && (
                <div className="bg-railway-darkest/70 p-4 rounded-2xl border border-railway-border/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Search className="w-4 h-4 text-railway-accent" />
                        Instant Seat / Berth Finder in Coach {selectedCoach.code}
                      </span>
                      <p className="text-[11px] text-railway-textSecondary">
                        Enter your booked seat number to see berth position and compartment layout.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max={selectedCoach.total_berths}
                        value={searchedSeatNum}
                        onChange={(e) => setSearchedSeatNum(e.target.value)}
                        placeholder={`1 - ${selectedCoach.total_berths}`}
                        className="w-28 bg-railway-card border border-railway-border rounded-xl px-3 py-1.5 text-xs text-white font-mono text-center focus:outline-none focus:border-railway-accent"
                      />
                      {searchedSeatNum && (
                        <button
                          onClick={() => setSearchedSeatNum("")}
                          className="text-xs text-railway-textMuted hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Seat Search Result Highlight Card */}
                  {isValidSearchedSeat && searchedSeatParsed <= selectedCoach.total_berths && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-railway-accent/20 via-amber-500/15 to-emerald-500/15 border border-railway-accent/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-railway-accent text-white font-mono font-extrabold flex items-center justify-center text-lg shadow-md">
                          {searchedSeatParsed}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {selectedCoach.layout_type === "6_berth_ac2" 
                                ? getBerthType6(searchedSeatParsed).type 
                                : getBerthType8(searchedSeatParsed).type}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-black">
                              {selectedCoach.layout_type === "6_berth_ac2" 
                                ? getBerthType6(searchedSeatParsed).code 
                                : getBerthType8(searchedSeatParsed).code}
                            </span>
                          </div>
                          <span className="text-xs text-railway-textSecondary">
                            Compartment: <strong>Bay {Math.ceil(searchedSeatParsed / (selectedCoach.layout_type === "6_berth_ac2" ? 6 : 8))}</strong> • Coach: <strong>{selectedCoach.code}</strong>
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-lg border border-emerald-500/30 self-start sm:self-auto">
                        ✓ Located inside Coach {selectedCoach.code}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Visual Compartment Matrix */}
              {selectedCoach.total_berths > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-railway-textMuted">
                    <span className="font-bold text-white">Full Compartment & Berth Matrix:</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">● Lower (LB)</span>
                      <span className="inline-flex items-center gap-1 text-sky-400 font-medium">● Middle (MB)</span>
                      <span className="inline-flex items-center gap-1 text-indigo-400 font-medium">● Upper (UB)</span>
                      <span className="inline-flex items-center gap-1 text-amber-400 font-medium">● Side Lower (SL)</span>
                      <span className="inline-flex items-center gap-1 text-orange-400 font-medium">● Side Upper (SU)</span>
                    </div>
                  </div>

                  {/* Compartment Bays Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Array.from({ length: Math.ceil(selectedCoach.total_berths / 8) }).map((_, bayIdx) => {
                      const bayNum = bayIdx + 1;
                      const startSeat = bayIdx * 8 + 1;
                      const seatsInBay = Array.from({ length: 8 })
                        .map((_, sIdx) => startSeat + sIdx)
                        .filter((s) => s <= selectedCoach.total_berths);

                      return (
                        <div
                          key={bayNum}
                          className="bg-railway-darkest/90 border border-railway-border/60 rounded-xl p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px] pb-1 border-b border-railway-border/40">
                            <span className="font-bold text-railway-textSecondary font-mono">
                              Bay {bayNum}
                            </span>
                            <span className="text-[10px] text-railway-textMuted">
                              Seats {startSeat}–{Math.min(startSeat + 7, selectedCoach.total_berths)}
                            </span>
                          </div>

                          {/* 8-Berth Grid */}
                          <div className="grid grid-cols-4 gap-1.5">
                            {seatsInBay.map((s) => {
                              const bInfo = getBerthType8(s);
                              const isTargeted = s === searchedSeatParsed;

                              return (
                                <button
                                  key={s}
                                  onClick={() => setSearchedSeatNum(String(s))}
                                  className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${bInfo.bg} ${
                                    isTargeted
                                      ? "ring-2 ring-white scale-110 font-bold z-10 shadow-lg"
                                      : "hover:scale-105"
                                  }`}
                                  title={`Seat ${s} - ${bInfo.type} (${bInfo.code})`}
                                >
                                  <span className="font-mono font-bold text-xs block leading-tight">
                                    {s}
                                  </span>
                                  <span className="text-[9px] font-bold block uppercase leading-tight">
                                    {bInfo.code}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-railway-textMuted bg-railway-darkest/50 rounded-xl border border-railway-border/40">
                  <Info className="w-6 h-6 mx-auto mb-2 text-railway-accent" />
                  <p className="font-semibold text-white">Unreserved Coach or Non-Passenger Rolling Stock</p>
                  <p className="text-xs text-railway-textSecondary mt-1">
                    This coach provides open seating or specialized operational services. No reserved berths.
                  </p>
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
};
