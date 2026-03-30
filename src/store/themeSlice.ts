import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ThemeId =
  | "classic"
  | "modern2"
  | "dark-pro"
  | "ocean"
  | "forest"
  | "purple"
  | "custom";
export type ThemeMode = "classic" | "modern" | "dark";
export type FontSize = "small" | "normal" | "large";

export interface CustomColors {
  primary: string;
  accent: string;
  bg: string;
  sidebar: string;
}

export interface ThemeState {
  themeId: ThemeId;
  themeMode: ThemeMode;
  fontFamily: string;
  fontSize: FontSize;
  customColors: CustomColors;
  isDark: boolean;
}

const STORAGE_KEY = "matchdb_theme_config";

function deriveThemeMode(themeId: ThemeId): ThemeMode {
  if (themeId === "classic") return "classic";
  if (themeId === "dark-pro") return "dark";
  return "modern";
}

function loadFromStorage(): Partial<ThemeState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<ThemeState>;
  } catch {
    return {};
  }
}

const stored = loadFromStorage();

const initialState: ThemeState = {
  themeId: (stored.themeId as ThemeId) || "classic",
  themeMode: deriveThemeMode((stored.themeId as ThemeId) || "classic"),
  fontFamily: stored.fontFamily || "Tahoma, sans-serif",
  fontSize: (stored.fontSize as FontSize) || "normal",
  customColors: stored.customColors || {
    primary: "#3b82f6",
    accent: "#f97316",
    bg: "#f1f5f9",
    sidebar: "#1e293b",
  },
  isDark: stored.isDark || false,
};

export const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (
      state,
      action: PayloadAction<{
        themeId: ThemeId;
        fontFamily?: string;
        fontSize?: FontSize;
        customColors?: CustomColors;
        isDark?: boolean;
      }>,
    ) => {
      const { themeId, fontFamily, fontSize, customColors, isDark } =
        action.payload;
      state.themeId = themeId;
      state.themeMode = deriveThemeMode(themeId);
      if (fontFamily !== undefined) state.fontFamily = fontFamily;
      if (fontSize !== undefined) state.fontSize = fontSize;
      if (customColors !== undefined) state.customColors = customColors;
      if (isDark !== undefined) state.isDark = isDark;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            themeId: state.themeId,
            fontFamily: state.fontFamily,
            fontSize: state.fontSize,
            customColors: state.customColors,
            isDark: state.isDark,
          }),
        );
      } catch {
        /* ignore */
      }
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;

export const selectThemeMode = (state: { theme: ThemeState }) =>
  state.theme.themeMode;
export const selectThemeId = (state: { theme: ThemeState }) =>
  state.theme.themeId;
