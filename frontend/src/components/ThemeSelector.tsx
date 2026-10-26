import React, { useState, useRef, useEffect } from "react";
import { Palette, Check, Sparkles, Sun, Moon } from "lucide-react";
import { useTheme, THEME_OPTIONS, ACCENT_OPTIONS, ThemeId, AccentId } from "../context/ThemeContext";

export const ThemeSelector: React.FC = () => {
  const { theme, accent, setTheme, setAccent, currentThemeOption } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-railway-surface border border-railway-border/80 hover:border-railway-accent/50 text-railway-textSecondary hover:text-white transition-all shadow-sm group"
        title="Change Visual Theme & Colors"
        aria-label="Theme Selector"
      >
        <div className="relative flex items-center justify-center">
          <Palette className="w-3.5 h-3.5 text-railway-accent group-hover:rotate-12 transition-transform" />
          <span
            className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-railway-surface"
            style={{ backgroundColor: currentThemeOption.accentHex }}
          />
        </div>
        <span className="text-[11px] font-medium hidden sm:inline-block max-w-[90px] truncate text-railway-textPrimary">
          {currentThemeOption.name.split(" ")[0]}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-railway-dark/95 backdrop-blur-xl border border-railway-border/80 shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-railway-border/60">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-railway-accent" />
              <span className="text-xs font-bold text-railway-textPrimary uppercase tracking-wider">
                Theme & Aesthetic
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-railway-accent/15 text-railway-accent border border-railway-accent/30 font-medium">
              Live Preview
            </span>
          </div>

          {/* Theme Options */}
          <div className="mt-3 space-y-1.5">
            <label className="text-[10px] font-mono uppercase text-railway-textMuted tracking-wider block">
              Color Palette
            </label>
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {THEME_OPTIONS.map((item) => {
                const isActive = theme === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTheme(item.id as ThemeId)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-railway-surface border border-railway-accent/60 shadow-sm"
                        : "hover:bg-railway-surface/60 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Color Preview Swatch */}
                      <div
                        className="w-5 h-5 rounded-lg border border-white/20 flex items-center justify-center shadow-inner relative overflow-hidden shrink-0"
                        style={{ backgroundColor: item.bgHex }}
                      >
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.accentHex }}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-railway-textPrimary truncate">
                            {item.name}
                          </span>
                          {!item.isDark ? (
                            <Sun className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          ) : (
                            <Moon className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-railway-textMuted block truncate">
                          {item.badge}
                        </span>
                      </div>
                    </div>

                    {isActive && (
                      <div className="w-4 h-4 rounded-full bg-railway-accent flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color Overrides */}
          <div className="mt-4 pt-3 border-t border-railway-border/60">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-mono uppercase text-railway-textMuted tracking-wider">
                Accent Highlight
              </label>
              <span className="text-[10px] text-railway-textSecondary font-medium">
                {ACCENT_OPTIONS.find((a) => a.id === accent)?.name}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1.5 px-1 py-1 bg-railway-darkest/60 rounded-xl border border-railway-border/40">
              {ACCENT_OPTIONS.map((acc) => {
                const isSelected = accent === acc.id;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setAccent(acc.id as AccentId)}
                    className={`w-7 h-7 rounded-lg transition-transform flex items-center justify-center relative ${
                      isSelected ? "scale-110 ring-2 ring-white/60 shadow-md" : "hover:scale-105 opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: acc.hex }}
                    title={acc.name}
                    aria-label={acc.name}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
