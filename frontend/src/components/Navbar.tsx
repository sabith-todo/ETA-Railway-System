import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Train, Radio, Compass, GitMerge, Clock, Activity, BrainCircuit, History, Settings as SettingsIcon } from "lucide-react";
import { ThemeSelector } from "./ThemeSelector";

interface NavbarProps {
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ wsConnected }) => {
  const location = useLocation();

  const navLinks = [
    { to: "/", label: "All Trains", icon: Train },
    { to: "/train/12635", label: "Dynamic ETA", icon: Compass },
    { to: "/map", label: "Live Network Map", icon: Radio },
    { to: "/connections", label: "Connection Risk", icon: GitMerge },
    { to: "/when-to-leave", label: "Departure Planner", icon: Clock },
    { to: "/travel-history", label: "Travel History", icon: History },
    { to: "/operations", label: "Operations Room", icon: Activity },
    { to: "/analytics", label: "AI Analytics", icon: BrainCircuit },
  ];

  return (
    <header className="sticky top-0 z-50 bg-railway-dark/95 backdrop-blur-md border-b border-railway-border/60 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-railway-accent to-railway-gold flex items-center justify-center shadow-lg shadow-railway-accent/20 group-hover:scale-105 transition-transform">
                <Train className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg tracking-tight text-white group-hover:text-railway-accent transition-colors">
                    RailForecast<span className="text-railway-accent">AI</span>
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Indian Railways PRS
                  </span>
                </div>
                <p className="text-[11px] text-railway-textMuted leading-none hidden sm:block">
                  National Railway Network • Real-time ETA & PRS Booking Intelligence
                </p>
              </div>
            </Link>
          </div>

          {/* Nav Links for Laptop & Desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-railway-accent text-white shadow-md shadow-railway-accent/25"
                      : "text-railway-textSecondary hover:text-white hover:bg-railway-surface"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Status & Quick Action */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-railway-surface border border-railway-border text-[11px]">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-railway-emerald animate-pulse' : 'bg-railway-ruby'}`} />
              <span className="text-railway-textSecondary font-medium hidden sm:inline">
                {wsConnected ? "Live Tracking" : "Connecting..."}
              </span>
            </div>

            {/* Theme & Palette Quick Switcher */}
            <ThemeSelector />

            <Link
              to="/settings"
              className="p-2 rounded-xl text-railway-textSecondary hover:text-white hover:bg-railway-surface border border-transparent hover:border-railway-border/60 transition-colors"
              title="System Configuration & Visual Theme Studio"
            >
              <SettingsIcon className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </div>
      
      {/* Scrollable Sub-bar for Tablets (md to lg) */}
      <div className="hidden md:flex lg:hidden items-center gap-1 px-4 py-2 bg-railway-surface/90 overflow-x-auto border-t border-railway-border/40 scrollbar-none">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-railway-accent text-white"
                  : "text-railway-textSecondary hover:text-white hover:bg-railway-card"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
};
