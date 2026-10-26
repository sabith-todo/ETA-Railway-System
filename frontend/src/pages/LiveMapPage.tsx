import React, { useState, useEffect, useCallback } from "react";
import { Radio } from "lucide-react";
import { fetchTrainList, fetchTrainRoute } from "../services/api";
import { Train as TrainType, RouteStation } from "../types";
import { LeafletMap } from "../components/LeafletMap";

interface LiveMapPageProps {
  lastWsEvent?: any;
}

export const LiveMapPage: React.FC<LiveMapPageProps> = ({ lastWsEvent }) => {
  const [trains, setTrains] = useState<TrainType[]>([]);
  const [selectedTrainId, setSelectedTrainId] = useState<string>("12627");
  const [routeStations, setRouteStations] = useState<RouteStation[]>([]);

  const loadSelectedRoute = useCallback(async (trainId: string) => {
    try {
      const rData = await fetchTrainRoute(trainId);
      setRouteStations(rData.stations || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadMapData = useCallback(async () => {
    try {
      const data = await fetchTrainList();
      const trainList = data.trains || [];
      setTrains(trainList);
      // Keep 12627 as default if present, or first train
      if (trainList.length > 0) {
        setSelectedTrainId((prev) => {
          const exists = trainList.some((t: TrainType) => t.number === prev);
          return exists ? prev : (trainList.some((t: TrainType) => t.number === "12627") ? "12627" : trainList[0].number);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  useEffect(() => {
    if (selectedTrainId) {
      loadSelectedRoute(selectedTrainId);
    }
  }, [selectedTrainId, loadSelectedRoute]);

  // Reactive WebSocket listener for real-time train movement on map
  useEffect(() => {
    if (!lastWsEvent) return;

    if (lastWsEvent.type === "SIM_TICK") {
      const tickTrains = lastWsEvent.data?.trains;
      if (Array.isArray(tickTrains) && tickTrains.length > 0) {
        const tickMap = new Map(tickTrains.map((t: any) => [t.number, t]));
        setTrains((prev) =>
          prev.map((train) => {
            const live = tickMap.get(train.number);
            if (live) {
              return {
                ...train,
                current_location: live.location,
                current_speed_kmh: live.speed_kmh,
                current_delay_min: live.delay_min,
                status: live.status,
                current_lat: live.lat,
                current_lon: live.lon
              };
            }
            return train;
          })
        );
      }
    } else if (lastWsEvent.type === "EVENT_INJECTED" || lastWsEvent.type === "SIM_RESET") {
      loadMapData();
      if (selectedTrainId) {
        loadSelectedRoute(selectedTrainId);
      }
    }
  }, [lastWsEvent, loadMapData, loadSelectedRoute, selectedTrainId]);

  const currentTrain = trains.find((t) => t.number === selectedTrainId) || trains[0];

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-railway-accent animate-pulse" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Live Network GIS Railway Map
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              OpenStreetMap Telemetry
            </span>
          </div>
          <p className="text-xs text-railway-textSecondary mt-0.5">
            Real-time track corridors, active coaching train positions, speed envelopes, and congested segments
          </p>
        </div>

        {/* Train Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-railway-textMuted">Focus Train:</label>
          <select
            value={selectedTrainId}
            onChange={(e) => setSelectedTrainId(e.target.value)}
            className="bg-railway-surface border border-railway-border rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-railway-accent"
          >
            {trains.map((t) => (
              <option key={t.number} value={t.number}>
                {t.number} - {t.name} ({t.current_location})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Map Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Map View */}
        <div className="lg:col-span-9 h-[620px] rounded-2xl overflow-hidden border border-railway-border/80 shadow-2xl">
          {currentTrain && (
            <LeafletMap
              stations={routeStations}
              trainLat={currentTrain.current_lat}
              trainLon={currentTrain.current_lon}
              trainNumber={currentTrain.number}
              trainSpeed={currentTrain.current_speed_kmh}
              trainDelay={currentTrain.current_delay_min}
              zoom={7}
            />
          )}
        </div>

        {/* Sidebar Telemetric Info */}
        <div className="lg:col-span-3 space-y-4">
          
          {currentTrain && (
            <div className="bg-railway-surface/80 rounded-2xl border border-railway-border p-5 shadow-xl space-y-4">
              <div>
                <span className="text-[10px] font-bold text-railway-accent uppercase tracking-wider block">
                  Tracked Telemetry
                </span>
                <h3 className="text-lg font-bold text-white font-mono mt-0.5">
                  {currentTrain.number}
                </h3>
                <p className="text-xs text-railway-textSecondary font-semibold">
                  {currentTrain.name}
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-railway-dark/60 border border-railway-border flex justify-between">
                  <span className="text-railway-textMuted">Current Speed</span>
                  <span className="font-mono font-bold text-railway-accent">{currentTrain.current_speed_kmh} km/h</span>
                </div>

                <div className="p-2.5 rounded-xl bg-railway-dark/60 border border-railway-border flex justify-between">
                  <span className="text-railway-textMuted">Current Delay</span>
                  <span className="font-mono font-bold text-amber-400">+{currentTrain.current_delay_min} min</span>
                </div>

                <div className="p-2.5 rounded-xl bg-railway-dark/60 border border-railway-border flex justify-between">
                  <span className="text-railway-textMuted">Location</span>
                  <span className="font-medium text-white text-right max-w-[140px] truncate">{currentTrain.current_location}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-railway-dark/60 border border-railway-border flex justify-between">
                  <span className="text-railway-textMuted">Route Corridor</span>
                  <span className="font-medium text-white text-right font-mono text-[11px]">{currentTrain.origin} → {currentTrain.destination}</span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={`/train/${currentTrain.number}`}
                  className="block w-full text-center py-2 rounded-xl bg-railway-accent hover:bg-railway-accentHover text-white text-xs font-bold transition-all"
                >
                  Open Full Dynamic ETA
                </a>
              </div>
            </div>
          )}

          {/* Map Legend */}
          <div className="bg-railway-surface/60 rounded-2xl border border-railway-border p-5 text-xs space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              Map Legend
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-railway-accent animate-ping" />
                <span className="text-railway-textSecondary">Active Train Telemetric Beacon</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-railway-textSecondary">Station Interlocking Junction</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-1 bg-railway-accent rounded" />
                <span className="text-railway-textSecondary">Double Track Electrified Trunk Route</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
