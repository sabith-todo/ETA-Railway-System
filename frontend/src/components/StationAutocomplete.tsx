import React, { useState, useRef, useEffect, useMemo } from "react";
import { MapPin, Check, X } from "lucide-react";

export interface StationItem {
  code: string;
  name: string;
  city?: string;
  state?: string;
  platforms?: number;
  zone?: string;
}

interface StationAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  stations: StationItem[];
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  id?: string;
  onSelect?: (station: StationItem) => void;
  className?: string;
}

const POPULAR_CODES = ["MAS", "MS", "CBE", "MDU", "TPJ", "SA", "TBM", "TEN", "ED", "CGL"];

export const StationAutocomplete: React.FC<StationAutocompleteProps> = ({
  value,
  onChange,
  stations,
  placeholder = "e.g. Chennai / MS / MAS",
  label,
  icon,
  id,
  onSelect,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered station list based on query
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) {
      // Return popular stations when query is empty
      const popular = stations.filter((s) => POPULAR_CODES.includes(s.code.toUpperCase()));
      return popular.length > 0 ? popular : stations.slice(0, 8);
    }

    // Rank:
    // 1. Exact code match
    // 2. Code starts with
    // 3. Name starts with
    // 4. Name contains
    // 5. City contains
    const exactCode: StationItem[] = [];
    const codeStarts: StationItem[] = [];
    const nameStarts: StationItem[] = [];
    const nameContains: StationItem[] = [];
    const cityContains: StationItem[] = [];

    for (const s of stations) {
      const code = s.code.toLowerCase();
      const name = s.name.toLowerCase();
      const city = (s.city || "").toLowerCase();

      if (code === q) {
        exactCode.push(s);
      } else if (code.startsWith(q)) {
        codeStarts.push(s);
      } else if (name.startsWith(q)) {
        nameStarts.push(s);
      } else if (name.includes(q)) {
        nameContains.push(s);
      } else if (city.includes(q)) {
        cityContains.push(s);
      }
    }

    return [...exactCode, ...codeStarts, ...nameStarts, ...nameContains, ...cityContains].slice(0, 10);
  }, [value, stations]);

  const handleSelectStation = (station: StationItem) => {
    // Fill with station name (or code if user typed code)
    const displayValue = station.name;
    onChange(displayValue);
    if (onSelect) {
      onSelect(station);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelectStation(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-[11px] font-bold text-railway-textMuted uppercase tracking-wider mb-1 flex items-center gap-1"
        >
          {icon || <MapPin className="w-3.5 h-3.5 text-railway-accent" />} {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full bg-railway-darkest/80 border border-railway-border rounded-xl pl-3.5 pr-8 py-2.5 text-sm text-railway-textPrimary placeholder-railway-textMuted focus:outline-none focus:border-railway-accent transition-colors font-medium"
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-2.5 text-xs text-railway-textMuted hover:text-railway-textPrimary p-0.5 rounded-full hover:bg-railway-card transition-colors"
            title="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-railway-card/95 backdrop-blur-xl border border-railway-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-1.5 border-b border-railway-border/60 flex items-center justify-between text-[10px] font-mono uppercase text-railway-textMuted px-3">
            <span>{value.trim() ? "Matching Stations" : "Popular TN Corridors"}</span>
            <span className="text-railway-accent">{suggestions.length} available</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-railway-border/30">
            {suggestions.map((station, index) => {
              const isHighlighted = index === highlightedIndex;
              const isSelected =
                value.toLowerCase() === station.name.toLowerCase() ||
                value.toUpperCase() === station.code.toUpperCase();

              return (
                <button
                  key={`${station.code}-${index}`}
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelectStation(station)}
                  className={`w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                    isHighlighted
                      ? "bg-railway-hover/60"
                      : isSelected
                      ? "bg-railway-surface/80"
                      : "hover:bg-railway-surface/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Station Code Badge */}
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-railway-accent/15 text-railway-accent border border-railway-accent/30 shrink-0">
                      {station.code}
                    </span>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-railway-textPrimary truncate">
                        {station.name}
                      </div>
                      <div className="text-[11px] text-railway-textSecondary truncate">
                        {station.city ? `${station.city}, ` : ""}
                        {station.state || "Tamil Nadu"} {station.zone ? `(${station.zone})` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {station.platforms && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-railway-darkest/60 text-railway-textMuted border border-railway-border/50">
                        PF {station.platforms}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-railway-accent" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
