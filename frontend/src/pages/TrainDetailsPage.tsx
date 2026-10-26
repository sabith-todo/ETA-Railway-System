import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { 
  Gauge, AlertTriangle, ShieldCheck, 
  MapPin, Radio, RefreshCw, Layers, ListOrdered, TableProperties,
  Calendar, ArrowLeft, Train, Clock, Bell, Share2, Armchair, Check,
  Volume2, Ticket
} from "lucide-react";
import { fetchTrainDetails, fetchTrainRoute, fetchDynamicETA } from "../services/api";
import { DynamicETAResponse, RouteStation, Train as TrainType } from "../types";
import { DynamicETATable } from "../components/DynamicETATable";
import { DelayForecastCard } from "../components/DelayForecastCard";
import { DelayContributorsPanel } from "../components/DelayContributorsPanel";
import { RouteTimeline } from "../components/RouteTimeline";
import { StationProgressStepper } from "../components/StationProgressStepper";
import { LeafletMap } from "../components/LeafletMap";
import { StationArrivalAlarmModal } from "../components/StationArrivalAlarmModal";
import { CoachPositionViewer } from "../components/CoachPositionViewer";
import { useAlarm } from "../context/AlarmContext";

interface TrainDetailsPageProps {
  lastWsEvent?: any;
}

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const TrainDetailsPage: React.FC<TrainDetailsPageProps> = ({ lastWsEvent }) => {
  const { id = "12635" } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const dateFromQuery = searchParams.get("date") || "";

  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();
  const [selectedDate, setSelectedDate] = useState<string>(dateFromQuery || todayStr);

  const { activeAlarm } = useAlarm();
  const [train, setTrain] = useState<TrainType | null>(null);
  const [routeStations, setRouteStations] = useState<RouteStation[]>([]);
  const [etaData, setEtaData] = useState<DynamicETAResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("");
  const [activeViewMode, setActiveViewMode] = useState<"stepper" | "coaches" | "table">("stepper");
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [alarmTargetStationCode, setAlarmTargetStationCode] = useState<string>("");
  const [shareCopied, setShareCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Stop any active speech synthesis on component unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playStationAnnouncement = () => {
    if (!train) return;

    if (isPlayingAudio) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);

    // 1. Play Indian Railways iconic 3-tone station chime (Web Audio API)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const notes = [587.33, 739.99, 880.00]; // Traditional D5 -> F#5 -> A5 Indian Railways chime
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.28);
          gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.28);
          gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + idx * 0.28 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.28 + 0.48);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.28);
          osc.stop(ctx.currentTime + idx * 0.28 + 0.5);
        });
      }
    } catch (err) {
      console.warn("Audio chime could not be initialized:", err);
    }

    // 2. Synthesize platform voice announcement after chime finishes
    setTimeout(() => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setIsPlayingAudio(false);
        return;
      }

      window.speechSynthesis.cancel();

      const nextSt = routeStations[train.current_station_idx + 1] || routeStations[train.current_station_idx];
      const platformStr = nextSt?.platform ? `on platform number ${nextSt.platform}` : "";
      const currentDelayMinutes = isFutureDate ? 0 : (etaData?.current_delay_minutes || 0);
      const delayStatus = currentDelayMinutes > 5
        ? `is running late by approximately ${Math.round(currentDelayMinutes)} minutes`
        : "is running right on schedule";

      const announcement = `May I have your attention please. Train number ${train.number.split("").join(" ")}, ${train.name}, from ${train.origin} to ${train.destination}, ${delayStatus}. Expected arrival at next station ${nextSt ? nextSt.station_name : train.destination} ${platformStr}. Thank you.`;

      const utter = new SpeechSynthesisUtterance(announcement);
      utter.rate = 0.9;
      utter.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const inVoice = voices.find(
        (v) => v.lang === "en-IN" || v.name.includes("India") || v.name.includes("Hindi")
      );
      if (inVoice) {
        utter.voice = inVoice;
      }

      utter.onend = () => setIsPlayingAudio(false);
      utter.onerror = () => setIsPlayingAudio(false);

      window.speechSynthesis.speak(utter);
    }, 920);
  };

  const isFutureDate = selectedDate > todayStr;

  const handleShareStatus = () => {
    if (!train) return;
    const delayStr = currentDelay > 0 ? `Running Late by ${Math.round(currentDelay)} mins` : "Running On Time";
    const nextSt = routeStations[train.current_station_idx + 1];
    const text = `🚆 Train ${train.number} ${train.name}\n📍 Current Location: ${train.current_location} (${train.current_speed_kmh} km/h)\n⏱ Status: ${delayStr}\n${nextSt ? `➡️ Next Stop: ${nextSt.station_name} (PF ${nextSt.platform || 1}) at ${nextSt.predicted_arrival || nextSt.scheduled_arrival}\n` : ""}🏁 Destination: ${train.destination} at ${isFutureDate ? train.arrival_time : (etaData?.predicted_eta || train.arrival_time)}\nTracked live on Southern Railway Dynamic Train ETA Platform.`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      });
    }
  };

  const loadTrainData = useCallback(async (trainId: string, targetDate?: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const effectiveDate = targetDate || selectedDate;

      const [tData, rData, eta] = await Promise.all([
        fetchTrainDetails(trainId, effectiveDate),
        fetchTrainRoute(trainId, effectiveDate),
        fetchDynamicETA(trainId)
      ]);

      setTrain(tData);
      setRouteStations(rData.stations || []);
      setEtaData(eta);
      setLastUpdatedTime(new Date().toLocaleTimeString());
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to load train telemetry.");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadTrainData(id, selectedDate);
  }, [id, selectedDate, loadTrainData]);

  const handleDateSelect = (newDate: string) => {
    setSelectedDate(newDate);
    if (newDate === todayStr) {
      searchParams.delete("date");
      setSearchParams(searchParams);
    } else {
      setSearchParams({ date: newDate });
    }
  };

  // Reactive WebSocket update listener
  useEffect(() => {
    if (!lastWsEvent || isFutureDate) return;

    if (
      lastWsEvent.type === "EVENT_INJECTED" || 
      lastWsEvent.type === "ETA_RECALCULATED" ||
      lastWsEvent.type === "SIM_RESET"
    ) {
      const eventData = lastWsEvent.data;
      if (eventData?.train_id === id || !eventData?.train_id) {
        if (eventData?.updated_eta) {
          setEtaData(eventData.updated_eta);
          setLastUpdatedTime(new Date().toLocaleTimeString());
        } else {
          loadTrainData(id, selectedDate, false);
        }
      }
    } else if (lastWsEvent.type === "SIM_TICK") {
      const matching = lastWsEvent.data?.trains?.find((t: any) => t.number === id);
      if (matching) {
        setTrain(prev => prev ? {
          ...prev,
          current_location: matching.location,
          current_speed_kmh: matching.speed_kmh,
          current_lat: matching.lat,
          current_lon: matching.lon
        } : null);
        setLastUpdatedTime(new Date().toLocaleTimeString());
      }
    }
  }, [lastWsEvent, id, loadTrainData, selectedDate, isFutureDate]);

  if (loading) {
    return (
      <div className="p-16 text-center text-railway-textSecondary space-y-3">
        <div className="w-10 h-10 border-2 border-railway-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-mono text-sm">Computing real-time dynamic ETA forecast...</p>
      </div>
    );
  }

  if (error || !train || !etaData) {
    return (
      <div className="p-12 text-center text-red-400 bg-red-500/10 rounded-2xl border border-red-500/30 max-w-xl mx-auto space-y-4">
        <AlertTriangle className="w-8 h-8 mx-auto" />
        <h3 className="font-bold text-lg">Error loading train telemetry</h3>
        <p className="text-sm text-railway-textSecondary">{error || "Train not found."}</p>
        <Link to="/" className="inline-block px-4 py-2 rounded-xl bg-railway-accent text-white text-xs font-bold">
          Return to Train Search
        </Link>
      </div>
    );
  }

  const currentDelay = isFutureDate ? 0 : etaData.current_delay_minutes;
  const predictedDestDelay = isFutureDate ? 0 : etaData.predicted_destination_delay_minutes;

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">

      {/* Navigation & Date Selection Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs text-railway-accent hover:text-white font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to All Indian Railways Trains
        </Link>

        {/* Date Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-railway-textMuted uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-railway-accent" /> Journey:
          </span>
          
          <button
            onClick={() => handleDateSelect(todayStr)}
            className={`text-xs px-3 py-1 rounded-lg border font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedDate === todayStr
                ? "bg-railway-accent text-white border-railway-accent shadow-sm"
                : "bg-railway-card text-railway-textSecondary border-railway-border hover:text-white"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Today (Live GPS)
          </button>

          <button
            onClick={() => handleDateSelect(tomorrowStr)}
            className={`text-xs px-3 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
              selectedDate === tomorrowStr
                ? "bg-railway-accent text-white border-railway-accent shadow-sm"
                : "bg-railway-card text-railway-textSecondary border-railway-border hover:text-white"
            }`}
          >
            Tomorrow
          </button>

          <input
            type="date"
            min={todayStr}
            value={selectedDate}
            onChange={(e) => handleDateSelect(e.target.value)}
            className="bg-railway-darkest border border-railway-border rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-railway-accent font-mono cursor-pointer"
          />
        </div>
      </div>

      {/* Future Journey Notice Banner (if future date selected) */}
      {isFutureDate && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-white text-sm block">
                Scheduled Timetable Trail for {train.journey_date_formatted || selectedDate}
              </span>
              <span className="text-railway-textSecondary">
                Viewing authentic Southern Railway schedules, platform numbers, and planned arrival/departure times.
              </span>
            </div>
          </div>
          <button
            onClick={() => handleDateSelect(todayStr)}
            className="px-3 py-1.5 rounded-xl bg-railway-accent hover:bg-railway-accentHover text-white font-bold text-xs transition-colors flex-shrink-0 cursor-pointer"
          >
            Switch to Live GPS Tracking
          </button>
        </div>
      )}
      
      {/* Train Header Banner */}
      <div className="bg-gradient-to-r from-railway-dark to-railway-surface rounded-2xl border border-railway-border/80 p-4 sm:p-6 shadow-xl relative overflow-hidden">
        
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-railway-accent/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-extrabold text-2xl sm:text-3xl text-white">
                {train.number}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-railway-textPrimary">
                {train.name}
              </h1>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-railway-card text-railway-gold border border-railway-border">
                {train.type}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                Tier {train.priority} Priority
              </span>
            </div>

            <p className="text-xs sm:text-sm text-railway-textSecondary flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white">{train.origin}</span>
              <span className="text-railway-accent">→</span>
              <span className="font-medium text-white">{train.destination}</span>
              <span className="text-railway-border">•</span>
              <span className="text-railway-textMuted">{train.route_name || "Southern Railway Corridor"}</span>
              {train.total_distance_km && (
                <>
                  <span className="text-railway-border">•</span>
                  <span className="text-railway-textMuted">{train.total_distance_km} km</span>
                </>
              )}
            </p>
          </div>

          {/* Live Key Metrics */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 sm:gap-4">
            
            {/* Current Delay Badge / Future Scheduled Badge */}
            <div className="p-3 rounded-xl bg-railway-darkest/70 border border-railway-border sm:min-w-[130px]">
              <span className="text-[10px] uppercase font-bold text-railway-textMuted tracking-wider block">
                {isFutureDate ? "Journey Status" : "Current Delay"}
              </span>
              <span className={`text-lg sm:text-xl font-mono font-bold ${
                isFutureDate ? "text-blue-400" : currentDelay > 20 ? "text-red-400" : currentDelay > 5 ? "text-amber-400" : "text-emerald-400"
              }`}>
                {isFutureDate ? "Scheduled" : currentDelay === 0 ? "On Time" : `+${currentDelay} min`}
              </span>
              <span className="text-[10px] text-railway-textMuted block mt-0.5 truncate max-w-[140px]">
                {isFutureDate ? (train.journey_date_formatted || selectedDate) : train.current_location}
              </span>
            </div>

            {/* Destination ETA Badge */}
            <div className="p-3 rounded-xl bg-railway-accent/15 border border-railway-accent/40 sm:min-w-[150px]">
              <span className="text-[10px] uppercase font-bold text-railway-accent tracking-wider block">
                {isFutureDate ? "Scheduled Arrival" : "Predicted Dest ETA"}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg sm:text-xl font-mono font-extrabold text-white">
                  {isFutureDate ? (train.arrival_time || etaData.predicted_eta) : etaData.predicted_eta}
                </span>
                {!isFutureDate && (
                  <span className="text-xs font-mono text-railway-accent font-bold">
                    (+{predictedDestDelay}m)
                  </span>
                )}
              </div>
              <span className="text-[10px] text-railway-textSecondary block mt-0.5 font-mono">
                {isFutureDate ? "Terminal Arrival Time" : `${etaData.prediction_range.lower} – ${etaData.prediction_range.upper}`}
              </span>
            </div>

            {/* AI Confidence / Reliability Badge */}
            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-railway-darkest/70 border border-railway-border sm:min-w-[120px]">
              <span className="text-[10px] uppercase font-bold text-railway-textMuted tracking-wider block">
                {isFutureDate ? "SR Punctuality" : "AI Confidence"}
              </span>
              <span className="text-lg sm:text-xl font-mono font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {isFutureDate ? "96%" : `${etaData.confidence_percent}%`}
              </span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">
                {isFutureDate ? "Historical On-Time" : "Dynamic ML Model"}
              </span>
            </div>

          </div>

        </div>

        {/* Telemetric Footer Bar */}
        <div className="mt-4 pt-4 border-t border-railway-border/50 flex flex-wrap items-center justify-between gap-3 text-xs text-railway-textMuted">
          <div className="flex items-center gap-4 flex-wrap">
            {!isFutureDate ? (
              <>
                <span className="flex items-center gap-1.5 font-mono text-white">
                  <Gauge className="w-3.5 h-3.5 text-railway-accent" />
                  Live Speed: <strong>{train.current_speed_kmh} km/h</strong>
                </span>
                <span className="flex items-center gap-1.5 text-railway-textSecondary">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  {train.current_location}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 text-white">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                Scheduled Coaching Train across Indian Railways Network
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Station Audio Chime & Announcement Button */}
            <button
              onClick={playStationAnnouncement}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isPlayingAudio
                  ? "bg-railway-accent text-white shadow-md shadow-railway-accent/30 animate-pulse"
                  : "bg-railway-surface hover:bg-railway-hover border border-railway-border text-railway-textSecondary hover:text-white"
              }`}
              title="Play station audio announcement with authentic Indian Railways chime"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isPlayingAudio ? "animate-bounce text-white" : "text-amber-400"}`} />
              <span>{isPlayingAudio ? "Stop Announcement" : "Station Audio Chime"}</span>
            </button>

            {/* Quick Ticket Booking Button */}
            <Link
              to={`/?tab=booking&from=${encodeURIComponent(train.origin)}&to=${encodeURIComponent(train.destination)}&train=${train.number}`}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-all hover:scale-105 shadow-sm"
              title="Book ticket on this train via Railway PRS allocation"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>Book Ticket</span>
            </Link>

            {/* Arrival Alarm Header Quick Button */}
            <button
              onClick={() => {
                setAlarmTargetStationCode(routeStations[routeStations.length - 1]?.station_code || "");
                setIsAlarmModalOpen(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeAlarm && activeAlarm.trainId === train.number && activeAlarm.isArmed
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20 animate-pulse"
                  : "bg-railway-surface hover:bg-railway-hover border border-railway-border text-railway-textSecondary hover:text-white"
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              {activeAlarm && activeAlarm.trainId === train.number && activeAlarm.isArmed ? (
                <span>Alarm: {activeAlarm.stationName}</span>
              ) : (
                <span>Set Arrival Alarm</span>
              )}
            </button>

            {/* Share Live Status */}
            <button
              onClick={handleShareStatus}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-railway-surface hover:bg-railway-hover border border-railway-border text-xs font-semibold text-railway-textSecondary hover:text-white transition-colors cursor-pointer"
              title="Copy live train status to clipboard"
            >
              {shareCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-railway-accent" />
                  <span>Share Status</span>
                </>
              )}
            </button>

            <button
              onClick={() => loadTrainData(id, selectedDate, false)}
              className="flex items-center gap-1 text-railway-accent hover:text-white transition-colors cursor-pointer"
              title="Refresh ETA"
            >
              <RefreshCw className="w-3 h-3" /> Refresh Telemetry
            </button>
            <span className="font-mono text-[11px]">
              Updated: <strong className="text-railway-textSecondary">{lastUpdatedTime}</strong>
            </span>
          </div>
        </div>

      </div>

      {/* Horizontal Overview Ribbon */}
      <RouteTimeline
        stations={routeStations}
        trainNumber={train.number}
        trainName={train.name}
        currentSpeed={isFutureDate ? 0 : train.current_speed_kmh}
        currentDelay={currentDelay}
      />

      {/* Interactive Map & Station Progress Stepper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Station Itinerary Stepper */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-railway-accent" />
              <h2 className="text-lg font-bold text-white tracking-tight">
                Live Station Itinerary & Route Progression
              </h2>
            </div>

            {/* Switch between Stepper, Coaches, and Detailed Table */}
            <div className="flex items-center gap-1 bg-railway-surface p-1 rounded-xl border border-railway-border">
              <button
                onClick={() => setActiveViewMode("stepper")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeViewMode === "stepper"
                    ? "bg-railway-accent text-white shadow-sm"
                    : "text-railway-textMuted hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Trail Stepper
              </button>
              <button
                onClick={() => setActiveViewMode("coaches")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeViewMode === "coaches"
                    ? "bg-railway-accent text-white shadow-sm"
                    : "text-railway-textMuted hover:text-white"
                }`}
              >
                <Armchair className="w-3.5 h-3.5" />
                Coach Layout
              </button>
              <button
                onClick={() => setActiveViewMode("table")}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeViewMode === "table"
                    ? "bg-railway-accent text-white shadow-sm"
                    : "text-railway-textMuted hover:text-white"
                }`}
              >
                <TableProperties className="w-3.5 h-3.5" />
                Table
              </button>
            </div>
          </div>

          {activeViewMode === "stepper" ? (
            <div className="bg-railway-card/70 border border-railway-border/60 rounded-2xl p-4 sm:p-5 shadow-lg">
              <StationProgressStepper
                stations={routeStations}
                currentStationIdx={isFutureDate ? 0 : train.current_station_idx}
                currentDelayMin={currentDelay}
                currentSpeedKmh={train.current_speed_kmh}
                trainNumber={train.number}
                trainName={train.name}
                isFutureDate={isFutureDate}
                journeyDate={train.journey_date_formatted || selectedDate}
                onOpenAlarmModal={(code) => {
                  setAlarmTargetStationCode(code);
                  setIsAlarmModalOpen(true);
                }}
              />
            </div>
          ) : activeViewMode === "coaches" ? (
            <div className="bg-railway-card/70 border border-railway-border/60 rounded-2xl p-4 sm:p-5 shadow-lg">
              <CoachPositionViewer
                trainNumber={train.number}
                trainName={train.name}
                currentStationCode={train.current_location}
                platformNumber={routeStations[train.current_station_idx]?.platform}
              />
            </div>
          ) : (
            <DynamicETATable
              stations={etaData.stations}
              predictionSource={etaData.prediction_source}
            />
          )}
        </div>

        {/* Right Column: Live Map & Delay Analytics */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Live Map Preview */}
          <div className="bg-railway-card/70 border border-railway-border/60 rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Radio className="w-4 h-4 text-railway-accent" />
                Route Geographical Map
              </h3>
              <Link to="/map" className="text-xs text-railway-accent hover:underline">
                Fullscreen Map →
              </Link>
            </div>

            <div className="h-[320px] rounded-xl overflow-hidden border border-railway-border/40">
              <LeafletMap
                stations={routeStations}
                trainLat={train.current_lat}
                trainLon={train.current_lon}
                trainNumber={train.number}
                trainSpeed={isFutureDate ? 0 : train.current_speed_kmh}
                trainDelay={currentDelay}
              />
            </div>
          </div>

          {/* Delay Contributors Factors */}
          <DelayContributorsPanel
            contributors={etaData.delay_contributors}
            totalImpactMinutes={etaData.total_predicted_impact_minutes}
          />

          {/* Delay Progression Forecast */}
          <DelayForecastCard etaData={etaData} />

        </div>

      </div>

      {/* Station Arrival Alarm Modal */}
      <StationArrivalAlarmModal
        isOpen={isAlarmModalOpen}
        onClose={() => setIsAlarmModalOpen(false)}
        stations={routeStations}
        trainNumber={train.number}
        trainName={train.name}
        preselectedStationCode={alarmTargetStationCode}
        currentDelayMin={currentDelay}
      />

    </div>
  );
};
