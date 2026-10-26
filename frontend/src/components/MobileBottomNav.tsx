import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Train, Radio, Compass, GitMerge, Clock, Activity, BrainCircuit, Settings, MoreHorizontal, X, History } from "lucide-react";

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainItems = [
    { to: "/", label: "Trains", icon: Train },
    { to: "/map", label: "Live Map", icon: Radio },
    { to: "/train/12635", label: "ETA Tracker", icon: Compass },
    { to: "/connections", label: "Connections", icon: GitMerge },
  ];

  const moreItems = [
    { to: "/travel-history", label: "Travel History", icon: History, desc: "Past journeys, coaches & eco savings" },
    { to: "/when-to-leave", label: "Departure Planner", icon: Clock, desc: "Optimal station leave-time" },
    { to: "/operations", label: "Operations Room", icon: Activity, desc: "Live section dispatch & telemetry" },
    { to: "/analytics", label: "AI Analytics", icon: BrainCircuit, desc: "Model performance & comparisons" },
    { to: "/settings", label: "System Settings", icon: Settings, desc: "Data provider & API configuration" },
  ];

  const isMoreActive = moreItems.some(i => location.pathname.startsWith(i.to));

  return (
    <>
      {/* More Menu Modal / Drawer */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-railway-surface border-t border-railway-border/80 rounded-t-2xl p-4 shadow-2xl space-y-3 pb-8">
            <div className="flex items-center justify-between pb-2 border-b border-railway-border/40">
              <span className="text-sm font-semibold text-railway-textPrimary tracking-wide">More Operations & Tools</span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-lg text-railway-textMuted hover:text-railway-textPrimary hover:bg-railway-card"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                      isActive
                        ? "bg-railway-accent/15 border border-railway-accent/40 text-railway-textPrimary"
                        : "bg-railway-card/50 hover:bg-railway-card border border-railway-border/30 text-railway-textSecondary hover:text-railway-textPrimary"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? "bg-railway-accent text-white" : "bg-railway-surface text-railway-textMuted"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-railway-textPrimary">{item.label}</div>
                      <div className="text-[11px] text-railway-textMuted">{item.desc}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Persistent Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-railway-dark/95 backdrop-blur-lg border-t border-railway-border/60 safe-area-pb shadow-lg">
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to.split("/")[1]);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                  isActive ? "text-railway-accent" : "text-railway-textMuted hover:text-railway-textSecondary"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-8 h-0.5 bg-railway-accent rounded-full animate-in fade-in duration-200" />
                )}
                <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""}`} />
                <span className="text-[10px] font-medium leading-none tracking-tight">{item.label}</span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
              isMoreActive || showMoreMenu ? "text-railway-accent" : "text-railway-textMuted hover:text-railway-textSecondary"
            }`}
          >
            {(isMoreActive || showMoreMenu) && (
              <span className="absolute top-0 w-8 h-0.5 bg-railway-accent rounded-full" />
            )}
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-none tracking-tight">More</span>
          </button>
        </div>
      </nav>
    </>
  );
};
