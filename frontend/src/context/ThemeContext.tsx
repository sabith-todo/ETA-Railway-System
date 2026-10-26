import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeId =
  | "royal-indigo"
  | "cyber-neon"
  | "electric-slate"
  | "emerald-rail"
  | "midnight-amber"
  | "light-daylight";

export type AccentId =
  | "violet"
  | "indigo"
  | "cyan"
  | "emerald"
  | "amber"
  | "rose";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  badge: string;
  description: string;
  bgHex: string;
  cardHex: string;
  accentHex: string;
  isDark: boolean;
}

export interface AccentOption {
  id: AccentId;
  name: string;
  hex: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "royal-indigo",
    name: "Royal Indigo & Violet",
    badge: "Futuristic Analytics",
    description: "Deep cosmic obsidian and rich indigo matrix with glowing electric violet accents.",
    bgHex: "#070818",
    cardHex: "#1A1E4D",
    accentHex: "#8B5CF6",
    isDark: true,
  },
  {
    id: "cyber-neon",
    name: "Cyberpunk Neon",
    badge: "High Tech",
    description: "Midnight deep purple with vivid neon highlights and ultra-modern contrast.",
    bgHex: "#06020E",
    cardHex: "#241149",
    accentHex: "#A855F7",
    isDark: true,
  },
  {
    id: "electric-slate",
    name: "Electric Blue & Slate",
    badge: "Mission Control",
    description: "Aerospace deep slate with electric sky blue telemetry indicators.",
    bgHex: "#070C16",
    cardHex: "#1C2E4A",
    accentHex: "#0284C7",
    isDark: true,
  },
  {
    id: "emerald-rail",
    name: "Emerald Rail & Gold",
    badge: "Vande Bharat",
    description: "Deep pine forest dark surfaces with crisp emerald speed and warm gold badges.",
    bgHex: "#04100C",
    cardHex: "#173F33",
    accentHex: "#10B981",
    isDark: true,
  },
  {
    id: "midnight-amber",
    name: "Midnight Amber",
    badge: "Classic Rail",
    description: "Original Indian Railways dark navy with high-visibility safety orange.",
    bgHex: "#070E18",
    cardHex: "#162B46",
    accentHex: "#FF6500",
    isDark: true,
  },
  {
    id: "light-daylight",
    name: "Daylight Modern Slate",
    badge: "Executive Light",
    description: "Crisp white and daylight slate with high-contrast typography and clear maps.",
    bgHex: "#F1F5F9",
    cardHex: "#FFFFFF",
    accentHex: "#6366F1",
    isDark: false,
  },
];

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "violet", name: "Electric Violet", hex: "#8B5CF6" },
  { id: "indigo", name: "Royal Indigo", hex: "#6366F1" },
  { id: "cyan", name: "Cyber Cyan", hex: "#06B6D4" },
  { id: "emerald", name: "Speed Emerald", hex: "#10B981" },
  { id: "amber", name: "Sunset Amber", hex: "#F97316" },
  { id: "rose", name: "Neon Magenta", hex: "#EC4899" },
];

interface ThemeContextType {
  theme: ThemeId;
  accent: AccentId;
  setTheme: (theme: ThemeId) => void;
  setAccent: (accent: AccentId) => void;
  currentThemeOption: ThemeOption;
  currentAccentOption: AccentOption;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "railway_eta_theme";
const ACCENT_STORAGE_KEY = "railway_eta_accent";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return (saved as ThemeId) || "royal-indigo";
  });

  const [accent, setAccentState] = useState<AccentId>(() => {
    const saved = localStorage.getItem(ACCENT_STORAGE_KEY);
    return (saved as AccentId) || "violet";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
    localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  }, [accent]);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
  };

  const setAccent = (newAccent: AccentId) => {
    setAccentState(newAccent);
  };

  const currentThemeOption =
    THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  const currentAccentOption =
    ACCENT_OPTIONS.find((a) => a.id === accent) || ACCENT_OPTIONS[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        accent,
        setTheme,
        setAccent,
        currentThemeOption,
        currentAccentOption,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
