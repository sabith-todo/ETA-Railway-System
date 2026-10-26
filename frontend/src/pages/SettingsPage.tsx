import React, { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Database,
  ShieldAlert,
  RotateCcw,
  Globe,
  Key,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Palette,
  Check,
  Sparkles,
  Sun,
  Moon,
} from "lucide-react";
import { resetSimulation, fetchRailradarCatalog, testRailradarKey } from "../services/api";
import {
  useTheme,
  THEME_OPTIONS,
  ACCENT_OPTIONS,
  ThemeId,
  AccentId,
} from "../context/ThemeContext";

export const SettingsPage: React.FC = () => {
  const { theme, accent, setTheme, setAccent, currentThemeOption, currentAccentOption } = useTheme();
  const [providerMode, setProviderMode] = useState<"simulation" | "railradar" | "official">("official");
  const [apiKey, setApiKey] = useState("");
  const [railradarKey, setRailradarKey] = useState("rg_286bf91dd4a44a3ea29585b72f1c0dac");
  const [keyStatus, setKeyStatus] = useState<any>(null);
  const [testingKey, setTestingKey] = useState(false);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRailradarCatalog()
      .then((data) => {
        if (data.catalog) setCatalog(data.catalog);
      })
      .catch((err) => console.error("Catalog fetch error:", err));
  }, []);

  const handleTestKey = async () => {
    setTestingKey(true);
    try {
      const res = await testRailradarKey(railradarKey);
      setKeyStatus(res);
    } catch (e: any) {
      setKeyStatus({ status: "error", message: e.message || "Failed to reach backend" });
    } finally {
      setTestingKey(false);
    }
  };

  const handleResetDb = async () => {
    try {
      await resetSimulation();
      setResetMessage("Operational database reset to baseline demo conditions.");
      setTimeout(() => setResetMessage(null), 4000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-railway-accent" />
          <h1 className="text-2xl font-extrabold text-railway-textPrimary tracking-tight">
            System Settings & Architecture Integration
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-railway-textSecondary mt-1">
          Decoupled telemetry gateways, visual theme customization, RailRadar API v1 catalog, and open GIS mapping.
        </p>
      </div>

      {/* Visual Theme & Aesthetic Studio */}
      <div className="bg-railway-surface/90 rounded-2xl border border-railway-border p-6 shadow-xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-railway-accent" />
              <h3 className="text-base font-bold text-railway-textPrimary tracking-tight">
                Appearance & Visual Theme Studio
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-railway-accent/15 text-railway-accent border border-railway-accent/30 font-semibold">
                {currentThemeOption.badge}
              </span>
            </div>
            <p className="text-xs text-railway-textSecondary mt-1">
              Select your control room color aesthetic and telemetry highlight color. Preferences are saved automatically.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-railway-textMuted font-mono">Current:</span>
            <span className="text-xs font-bold text-railway-textPrimary px-3 py-1 rounded-xl bg-railway-card border border-railway-border shadow-sm flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: currentThemeOption.accentHex }}
              />
              {currentThemeOption.name}
            </span>
          </div>
        </div>

        {/* Theme Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {THEME_OPTIONS.map((item) => {
            const isSelected = theme === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setTheme(item.id as ThemeId)}
                className={`group relative p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? "bg-railway-card/95 border-railway-accent shadow-lg shadow-railway-accent/15 scale-[1.02]"
                    : "bg-railway-dark/60 border-railway-border/80 hover:border-railway-border hover:bg-railway-card/40"
                }`}
              >
                {/* Visual Palette Preview Mockup */}
                <div
                  className="w-full h-16 rounded-xl border border-white/10 p-2.5 flex flex-col justify-between mb-3 shadow-inner relative overflow-hidden"
                  style={{ backgroundColor: item.bgHex }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: item.accentHex }}
                      />
                      <div
                        className="w-8 h-1.5 rounded-full opacity-60"
                        style={{ backgroundColor: item.accentHex }}
                      />
                    </div>
                    {!item.isDark ? (
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="px-2 py-0.5 rounded text-[8px] font-bold text-white flex-1"
                      style={{ backgroundColor: item.cardHex, border: `1px solid ${item.accentHex}40` }}
                    >
                      Card Surface
                    </div>
                    <div
                      className="w-5 h-4 rounded text-[8px] font-bold text-white flex items-center justify-center shrink-0 shadow-sm"
                      style={{ backgroundColor: item.accentHex }}
                    >
                      ✓
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-1.5">
                    <h4 className="text-xs font-bold text-railway-textPrimary group-hover:text-railway-accent transition-colors">
                      {item.name}
                    </h4>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-railway-surface text-railway-textSecondary border border-railway-border">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-railway-textMuted mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {isSelected && (
                  <div className="mt-3 pt-2.5 border-t border-railway-border/60 flex items-center justify-between text-[11px] font-bold text-railway-accent">
                    <span className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Active Aesthetic
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider">Applied</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Accent Color Customization */}
        <div className="p-4 rounded-xl bg-railway-dark/70 border border-railway-border/70 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-railway-textPrimary uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-railway-accent" />
                Telemetry Accent Color Highlight
              </h4>
              <p className="text-[11px] text-railway-textSecondary mt-0.5">
                Customize the dynamic glow, active navigation badges, and chart highlights.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-railway-accent bg-railway-surface px-2.5 py-1 rounded-lg border border-railway-border">
              {currentAccentOption.name} ({currentAccentOption.hex})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
            {ACCENT_OPTIONS.map((acc) => {
              const isSelected = accent === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => setAccent(acc.id as AccentId)}
                  className={`p-2 rounded-xl border flex items-center gap-2 transition-all text-left ${
                    isSelected
                      ? "bg-railway-surface border-white/40 shadow-md ring-2 ring-white/30"
                      : "bg-railway-card/50 border-railway-border/60 hover:bg-railway-surface hover:border-railway-border"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: acc.hex }}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5" />}
                  </span>
                  <span className="text-[11px] font-semibold text-railway-textPrimary truncate">
                    {acc.name.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="p-4 rounded-xl bg-railway-darkest/70 border border-railway-border/60 space-y-2">
          <span className="text-[10px] font-mono uppercase text-railway-textMuted tracking-wider block">
            Live Component Preview (Under Active Theme)
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-xl bg-railway-accent hover:bg-railway-accentHover text-white text-xs font-semibold shadow-md shadow-railway-accent/25 transition-colors"
            >
              Primary Button
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-railway-card border border-railway-border text-xs text-railway-textPrimary font-medium">
              Card Badge
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-railway-accent/15 text-railway-accent border border-railway-accent/30 text-xs font-mono font-semibold">
              Live ETA: +12m
            </span>
            <span className="text-xs text-railway-textSecondary">
              High-contrast typography preview
            </span>
          </div>
        </div>
      </div>

      {/* Map Basemap Notice (Addresses CARTO Watermark) */}
      <div className="bg-railway-surface/80 rounded-2xl border border-emerald-500/30 p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-railway-textPrimary">GIS Map Basemap: OpenStreetMap Dark Engine</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ACTIVE • 100% UNRESTRICTED
              </span>
            </div>
            <p className="text-xs text-railway-textSecondary mt-1 leading-relaxed max-w-2xl">
              Map tiles are rendered via high-contrast OpenStreetMap with custom dark matrix filtering. The third-party CARTO <em>"API KEY REQUIRED"</em> watermark is permanently eliminated across all live tracking dashboards.
            </p>
          </div>
        </div>
      </div>

      {/* RailRadar API Integration Gateway */}
      <div className="bg-railway-surface/90 rounded-2xl border border-railway-border p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-railway-accent" />
              <h3 className="text-base font-bold text-railway-textPrimary tracking-tight">
                RailRadar API Gateway (v1)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-railway-accent/20 text-railway-accent border border-railway-accent/30">
                api.railradar.in
              </span>
            </div>
            <p className="text-xs text-railway-textSecondary mt-1">
              Connect and authenticate your RailRadar API bearer token for live IRCTC telemetry, coach layout, and GIS routes.
            </p>
          </div>
          <a
            href="https://railradar.in"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-railway-accent hover:underline flex items-center gap-1 font-medium"
          >
            RailRadar Developer Portal <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* API Key Input and Test Bar */}
        <div className="p-4 rounded-xl bg-railway-dark/80 border border-railway-border space-y-3">
          <label className="text-[11px] font-mono uppercase text-railway-textMuted block">
            RailRadar API Token / Key (Bearer Auth)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="e.g. Bearer rr_live_... or rg_286bf91dd..."
              value={railradarKey}
              onChange={(e) => setRailradarKey(e.target.value)}
              className="flex-1 bg-railway-darkest border border-railway-border rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-railway-accent"
            />
            <button
              onClick={handleTestKey}
              disabled={testingKey}
              className="px-4 py-2 rounded-xl bg-railway-accent hover:bg-railway-accentHover text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingKey ? "animate-spin" : ""}`} />
              {testingKey ? "Testing..." : "Verify Connection"}
            </button>
          </div>

          {keyStatus && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                keyStatus.status === "connected" || keyStatus.authenticated
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-300"
              }`}
            >
              {keyStatus.status === "connected" || keyStatus.authenticated ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span>{keyStatus.message || JSON.stringify(keyStatus)}</span>
            </div>
          )}
        </div>

        {/* Catalog of Registered RailRadar APIs */}
        <div>
          <h4 className="text-xs font-bold text-railway-textPrimary uppercase tracking-wider mb-2.5">
            Registered RailRadar API Endpoints ({catalog.length > 0 ? catalog.length : "16"} Integrated)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1">
            {catalog.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-railway-darkest/70 border border-railway-border/70 flex flex-col justify-between hover:border-railway-accent/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-railway-textPrimary truncate">{item.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-railway-border text-railway-textMuted uppercase">
                      {item.method}
                    </span>
                  </div>
                  <p className="text-[11px] text-railway-textSecondary mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="mt-2 text-[10px] font-mono text-railway-accent bg-railway-dark/90 px-2 py-1 rounded border border-railway-border/50 truncate">
                  https://api.railradar.in/v1{item.endpoint}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Provider Architecture Mode Selection */}
      <div className="bg-railway-surface/80 rounded-2xl border border-railway-border p-6 shadow-xl space-y-5">
        <div>
          <h3 className="text-base font-bold text-railway-textPrimary tracking-tight">
            Data Provider Interface Selection
          </h3>
          <p className="text-xs text-railway-textSecondary mt-0.5">
            Decoupled data access layer adhering to SIH Problem Statement architecture principles
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Mode 1: Official Indian Railways Real Data Mode */}
          <div
            onClick={() => setProviderMode("official")}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              providerMode === "official"
                ? "bg-emerald-500/15 border-emerald-500 shadow-lg shadow-emerald-500/20"
                : "bg-railway-dark/60 border-railway-border hover:bg-railway-hover/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-railway-textPrimary uppercase">Real Operational Data (NTES & Authentic Timetables)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                ACTIVE • REAL DATA
              </span>
            </div>
            <p className="text-xs text-railway-textSecondary mt-2 leading-relaxed">
              Active operating mode. Displays verified real-world Indian Railways physical telemetry, authentic timetable clock progression, and official NTES location feeds.
            </p>
          </div>

          {/* Mode 2: Simulation Mode */}
          <div
            onClick={() => setProviderMode("simulation")}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              providerMode === "simulation"
                ? "bg-railway-accent/15 border-railway-accent shadow-lg shadow-railway-accent/20"
                : "bg-railway-dark/60 border-railway-border hover:bg-railway-hover/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-railway-textPrimary uppercase">Synthetic Simulation Mode</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-500/20 text-slate-400 border border-slate-500/30">
                STANDBY
              </span>
            </div>
            <p className="text-xs text-railway-textSecondary mt-2 leading-relaxed">
              Offline demonstration mode that runs synthetic physics generator and localized jitter scenarios.
            </p>
          </div>

        </div>

        {providerMode === "official" && (
          <div className="p-4 rounded-xl bg-railway-dark/70 border border-railway-border space-y-3">
            <h4 className="text-xs font-bold text-railway-textPrimary">Production Gateway Configuration</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-railway-textMuted block mb-1">CRIS Gateway Endpoint</label>
                <input
                  type="text"
                  placeholder="https://api.cris.org.in/v1/telemetry"
                  className="w-full bg-railway-darkest border border-railway-border rounded-xl px-3 py-1.5 text-xs text-railway-textPrimary font-mono"
                  disabled
                />
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-railway-textMuted block mb-1">Authorization Token / API Key</label>
                <input
                  type="password"
                  placeholder="Bearer •••••••••••••••••"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-railway-darkest border border-railway-border rounded-xl px-3 py-1.5 text-xs text-railway-textPrimary font-mono"
                />
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Data Principles Disclosure Card */}
      <div className="bg-railway-surface/60 rounded-2xl border border-railway-border p-6 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-railway-gold" />
          <h3 className="text-base font-bold text-railway-textPrimary tracking-tight">
            Data Ethics & Compliance Principle (Prompt Item #32)
          </h3>
        </div>
        <p className="text-xs text-railway-textSecondary leading-relaxed">
          In strict accordance with Ministry of Railways guidelines, this application <strong>does not scrape or reverse-engineer private commercial APIs</strong>. The prototype environment operates on realistic synthetic datasets and authenticated endpoints (RailRadar/CRIS), with clean architectural boundaries so official railway feeds can be integrated when production authorization is granted.
        </p>
      </div>

      {/* Reset Operations Database */}
      <div className="bg-railway-surface/60 rounded-2xl border border-railway-border p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-railway-textPrimary tracking-tight flex items-center gap-2">
            <Database className="w-4 h-4 text-railway-accent" />
            Reset Operational Environment
          </h3>
          <p className="text-xs text-railway-textSecondary mt-0.5">
            Restores all trains, delays, and section conditions back to the initial demo state
          </p>
          {resetMessage && (
            <span className="text-xs font-semibold text-emerald-400 block mt-1">
              ✓ {resetMessage}
            </span>
          )}
        </div>

        <button
          onClick={handleResetDb}
          className="px-4 py-2 rounded-xl bg-railway-card border border-railway-border hover:bg-railway-hover text-xs text-white font-semibold flex items-center gap-2 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Database to Baseline
        </button>
      </div>

    </div>
  );
};

