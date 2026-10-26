import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { RouteStation } from "../types";

interface LeafletMapProps {
  stations: RouteStation[];
  trainLat?: number;
  trainLon?: number;
  trainNumber: string;
  trainSpeed: number;
  trainDelay: number;
  _congestedSectionId?: string;
  zoom?: number;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  stations,
  trainLat,
  trainLon,
  trainNumber,
  trainSpeed,
  trainDelay,
  _congestedSectionId,
  zoom = 8
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const trainMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const stationMarkersGroupRef = useRef<L.FeatureGroup | null>(null);
  const prevTrainNumberRef = useRef<string>(trainNumber);

  // Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = trainLat || (stations.length > 0 && stations[0].lat) || 12.5;
      const initialLon = trainLon || (stations.length > 0 && stations[0].lon) || 78.5;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLon],
        zoom: zoom,
        zoomControl: true,
      });

      // High-contrast dark basemap (OpenStreetMap with dark filter, 100% free with no watermark)
      const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        subdomains: "abc",
        maxZoom: 19,
        className: "railway-dark-tiles"
      }).addTo(map);

      const tileContainer = tileLayer.getContainer();
      if (tileContainer) {
        tileContainer.style.filter = "brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7)";
      }

      // Create feature group for station markers
      const stationGroup = L.featureGroup().addTo(map);
      stationMarkersGroupRef.current = stationGroup;

      mapInstanceRef.current = map;
    }
  }, []);

  // Update Route Polyline & Station Markers whenever stations or trainNumber changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const validStations = stations.filter((s) => s.lat && s.lon);
    if (validStations.length === 0) return;

    // 1. Clear old station markers
    if (stationMarkersGroupRef.current) {
      stationMarkersGroupRef.current.clearLayers();
    } else {
      stationMarkersGroupRef.current = L.featureGroup().addTo(map);
    }

    // 2. Remove old route polyline
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
    }

    // 3. Draw new route polyline
    const latlngs: [number, number][] = validStations.map((s) => [s.lat!, s.lon!]);
    const polyline = L.polyline(latlngs, {
      color: "#FF6500",
      weight: 4,
      opacity: 0.9,
      dashArray: "1, 6"
    }).addTo(map);
    routeLineRef.current = polyline;

    // 4. Add new station markers
    validStations.forEach((st) => {
      const isPassed = st.status === "Passed";
      const isCurrent = st.status === "Current";
      const markerColor = isCurrent ? "#FF6500" : (isPassed ? "#10B981" : "#64748B");

      const stationIcon = L.divIcon({
        className: "custom-station-marker",
        html: `
          <div style="
            width: ${isCurrent ? "16px" : "12px"};
            height: ${isCurrent ? "16px" : "12px"};
            background-color: ${markerColor};
            border: 2px solid #FFFFFF;
            border-radius: 50%;
            box-shadow: 0 0 10px ${isCurrent ? "rgba(255,101,0,0.9)" : "rgba(16,185,129,0.7)"};
            transition: all 0.3s ease;
          "></div>
        `,
        iconSize: [isCurrent ? 16 : 12, isCurrent ? 16 : 12],
        iconAnchor: [isCurrent ? 8 : 6, isCurrent ? 8 : 6]
      });

      const marker = L.marker([st.lat!, st.lon!], { icon: stationIcon });
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; padding: 4px;">
          <strong style="color: #FF6500; font-size: 13px;">${st.station_name} (${st.station_code})</strong><br/>
          <span style="color: #94A3B8;">Distance: ${st.distance_km} km</span><br/>
          <span style="color: #F8FAFC;">Status: <strong>${st.status}</strong></span>
        </div>
      `);
      stationMarkersGroupRef.current?.addLayer(marker);
    });

    // 5. Always fit bounds when train or route changes to ensure correct geographic view
    try {
      const bounds = polyline.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      }
    } catch (e) {
      console.warn("Could not fit bounds:", e);
    }

    prevTrainNumberRef.current = trainNumber;
  }, [stations, trainNumber]);

  // Update animated Train Marker when coordinates or telemetry changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const curLat = trainLat || (stations.length > 0 && stations[0].lat) || 12.0;
    const curLon = trainLon || (stations.length > 0 && stations[0].lon) || 78.0;

    const trainIcon = L.divIcon({
      className: "custom-train-marker",
      html: `
        <div style="
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          background: linear-gradient(135deg, #FF6500, #FFB200);
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          box-shadow: 0 0 16px rgba(255,101,0,0.95);
          animation: pulse 2s infinite;
        ">
          <svg style="width: 19px; height: 19px; fill: white;" viewBox="0 0 24 24">
            <path d="M4 15.5C4 17.43 5.57 19 7.5 19L6 20.5V21H18V20.5L16.5 19C18.43 19 20 17.43 20 15.5V5C20 1.5 16.42 1 12 1C7.58 1 4 1.5 4 5V15.5ZM12 3C16 3 18 3.37 18 5V10H6V5C6 3.37 8 3 12 3ZM6 12H18V15.5C18 16.33 17.33 17 16.5 17H7.5C6.67 17 6 16.33 6 15.5V12ZM7.5 16C8.33 16 9 15.33 9 14.5C9 13.67 8.33 13 7.5 13C6.67 13 6 13.67 6 14.5C6 15.33 6.67 16 7.5 16ZM16.5 16C17.33 16 18 15.33 18 14.5C18 13.67 17.33 13 16.5 13C15.67 13 15 13.67 15 14.5C15 15.33 15.67 16 16.5 16Z"/>
          </svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    if (!trainMarkerRef.current) {
      trainMarkerRef.current = L.marker([curLat, curLon], { icon: trainIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      trainMarkerRef.current.setLatLng([curLat, curLon]);
    }

    trainMarkerRef.current.bindPopup(`
      <div style="font-family: inherit; font-size: 12px; padding: 4px;">
        <strong style="color: #FF6500; font-size: 13px;">Train ${trainNumber}</strong><br/>
        <span>Current Speed: <strong>${trainSpeed} km/h</strong></span><br/>
        <span>Delay: <strong style="color: ${trainDelay > 0 ? '#EF4444' : '#10B981'};">+${trainDelay} min</strong></span><br/>
        <span style="font-size: 10px; color: #94A3B8;">GPS Coordinates: ${curLat.toFixed(4)}, ${curLon.toFixed(4)}</span>
      </div>
    `);
  }, [trainLat, trainLon, trainNumber, trainSpeed, trainDelay, stations]);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-2xl overflow-hidden border border-railway-border shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px]" />
      
      {/* Overlay Badge */}
      <div className="absolute top-3 right-3 z-[400] bg-railway-dark/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-railway-border text-[11px] font-mono flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-railway-accent animate-ping" />
        <span className="text-white">Live GPS Telemetry</span>
      </div>
    </div>
  );
};
