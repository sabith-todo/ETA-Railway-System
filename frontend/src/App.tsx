import React, { useState, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AlarmProvider } from "./context/AlarmContext";
import { Navbar } from "./components/Navbar";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { LiveNotificationToast, ToastItem } from "./components/LiveNotificationToast";
import { ActiveAlarmBar } from "./components/ActiveAlarmBar";
import { AlarmRingingOverlay } from "./components/AlarmRingingOverlay";
import { useRailwaySocket, WebSocketMessage } from "./services/socket";

// Pages
import { HomePage } from "./pages/HomePage";
import { TrainDetailsPage } from "./pages/TrainDetailsPage";
import { ForecastPage } from "./pages/ForecastPage";
import { LiveMapPage } from "./pages/LiveMapPage";
import { ConnectionPlannerPage } from "./pages/ConnectionPlannerPage";
import { DeparturePlannerPage } from "./pages/DeparturePlannerPage";
import { OperationsDashboardPage } from "./pages/OperationsDashboardPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TravelHistoryPage } from "./pages/TravelHistoryPage";

export const App: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [lastWsEvent, setLastWsEvent] = useState<WebSocketMessage | null>(null);

  const handleSocketMessage = useCallback((msg: WebSocketMessage) => {
    setLastWsEvent(msg);

    if (msg.type === "EVENT_INJECTED") {
      const data = msg.data;
      const toastId = `toast_${Date.now()}_${Math.random()}`;
      
      const newToast: ToastItem = {
        id: toastId,
        title: data.event_type === "clear_conditions" ? "Restrictions Cleared" : "Operational Update",
        message: `${data.description} (ETA impact: ${data.impact_minutes > 0 ? `+${data.impact_minutes}m` : `${data.impact_minutes}m`})`,
        type: data.event_type === "clear_conditions" ? "success" : "disruption",
        timestamp: new Date().toLocaleTimeString()
      };

      setToasts(prev => [newToast, ...prev.slice(0, 3)]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toastId));
      }, 6000);
    }
  }, []);

  const { isConnected } = useRailwaySocket(handleSocketMessage);

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ThemeProvider>
      <Router>
        <AlarmProvider>
          <div className="min-h-screen bg-railway-darkest text-railway-textPrimary flex flex-col selection:bg-railway-accent selection:text-white transition-colors duration-200">
            
            {/* Navigation Bar */}
            <Navbar wsConnected={isConnected} />

            {/* Persistent Active Arrival Alarm Pill Banner */}
            <ActiveAlarmBar />

            {/* Full Screen Alarm Ringing Overlay (When Triggered) */}
            <AlarmRingingOverlay />

            {/* Dynamic Global Toast Notifications */}
            <LiveNotificationToast toasts={toasts} onDismiss={handleDismissToast} />

            {/* Main Content Area: Responsive padding with safe spacing for mobile bottom navigation */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-20 md:pb-8">
            <Routes>
              <Route path="/" element={<HomePage lastWsEvent={lastWsEvent} />} />
              <Route path="/train/:id" element={<TrainDetailsPage lastWsEvent={lastWsEvent} />} />
              <Route path="/train/:id/forecast" element={<ForecastPage />} />
              <Route path="/map" element={<LiveMapPage lastWsEvent={lastWsEvent} />} />
              <Route path="/connections" element={<ConnectionPlannerPage />} />
              <Route path="/when-to-leave" element={<DeparturePlannerPage />} />
              <Route path="/operations" element={<OperationsDashboardPage lastWsEvent={lastWsEvent} />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/travel-history" element={<TravelHistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>

          {/* Footer for Desktop / Laptops */}
          <footer className="hidden md:block bg-railway-dark border-t border-railway-border/60 py-6 mt-12 text-xs text-railway-textMuted">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="font-bold text-railway-textPrimary">Indian Railways Dynamic Train Tracking & PRS Booking Intelligence</span>
                <p className="text-[11px] text-railway-textSecondary mt-0.5">
                  Pan-India Rail Corridor Network • Real-time Timetable, Delay Forecasting & PRS Seat Allocation
                </p>
              </div>

              <div className="flex items-center gap-3 text-[11px]">
                <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                  Live Data Engine
                </span>
                <span className="text-railway-textSecondary">Indian Railways (IRCTC / CRIS)</span>
              </div>
            </div>
          </footer>

          {/* Mobile Bottom Navigation Bar (Phones only) */}
          <MobileBottomNav />

          </div>
        </AlarmProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
