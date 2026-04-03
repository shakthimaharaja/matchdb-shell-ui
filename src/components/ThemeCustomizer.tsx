import React, { useState, useEffect, useCallback } from "react";
import {
  useTheme,
  type ThemeMode,
  type TextSize,
} from "matchdb-component-library";
import "./ThemeCustomizer.css";

/* ── Types ─────────────────────────────────────────────────────────────── */
export interface ThemeCustomizerProps {
  /** Whether the panel is open */
  isOpen: boolean;
  onClose: () => void;
}

/* ── Theme preview definitions ─────────────────────────────────────────── */
const THEME_DEFS: {
  id: ThemeMode;
  name: string;
  sidebar: string;
  header: string;
  bg: string;
  bar1: string;
  bar2: string;
  bar3: string;
}[] = [
  {
    id: "legacy",
    name: "W97",
    sidebar: "#c0c0c0",
    header: "#235a81",
    bg: "#f3f3f3",
    bar1: "#235a81",
    bar2: "#888",
    bar3: "#aaa",
  },
  {
    id: "classic",
    name: "AWS",
    sidebar: "#232f3e",
    header: "#232f3e",
    bg: "#f2f3f3",
    bar1: "#ff9900",
    bar2: "#555",
    bar3: "#999",
  },
  {
    id: "modern",
    name: "SaaS",
    sidebar: "#1c2b33",
    header: "#2ca01c",
    bg: "#f0f4f2",
    bar1: "#2ca01c",
    bar2: "#64748b",
    bar3: "#94a3b8",
  },
];

/* ── Color state helpers ────────────────────────────────────────────────── */
const CUSTOM_KEY = "matchdb_custom_colors";

interface CustomColors {
  primary: string;
  accent: string;
}

function loadCustomColors(): CustomColors {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (raw) return JSON.parse(raw) as CustomColors;
  } catch {
    /* ignore */
  }
  return { primary: "#2ca01c", accent: "#0077c5" };
}

function applyCustomColors(c: CustomColors) {
  const root = document.documentElement;
  root.style.setProperty("--modern-primary", c.primary);
  root.style.setProperty("--modern-accent", c.accent);
}

function isValidHex(h: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(h);
}

/* ── ColorRow sub-component ────────────────────────────────────────────── */
const ColorRow: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => {
  const [hex, setHex] = useState(value);

  useEffect(() => {
    setHex(value);
  }, [value]);

  const commitHex = useCallback(() => {
    if (isValidHex(hex)) onChange(hex);
    else setHex(value); // revert on invalid
  }, [hex, value, onChange]);

  return (
    <div className="tc-color-item">
      <span className="tc-color-lbl">{label}</span>
      <div className="tc-color-row">
        <input
          type="color"
          className="tc-color-swatch"
          value={value}
          onChange={(e) => {
            setHex(e.target.value);
            onChange(e.target.value);
          }}
        />
        <input
          type="text"
          className="tc-color-hex"
          value={hex}
          maxLength={7}
          onChange={(e) => setHex(e.target.value)}
          onBlur={commitHex}
          onKeyDown={(e) => e.key === "Enter" && commitHex()}
          spellCheck={false}
        />
      </div>
    </div>
  );
};

/* ── ThemeCard sub-component ────────────────────────────────────────────── */
const ThemeCard: React.FC<{
  def: (typeof THEME_DEFS)[0];
  active: boolean;
  onClick: () => void;
}> = ({ def, active, onClick }) => (
  <button
    type="button"
    className={`tc-theme-card${active ? " active" : ""}`}
    onClick={onClick}
    title={def.name}
  >
    <div className="tc-card-preview">
      <div className="tc-card-sidebar" style={{ background: def.sidebar }} />
      <div className="tc-card-main" style={{ background: def.bg }}>
        <div className="tc-card-bar w80" style={{ background: def.bar1 }} />
        <div className="tc-card-bar w60" style={{ background: def.bar2 }} />
        <div className="tc-card-bar w45" style={{ background: def.bar3 }} />
      </div>
    </div>
    <div className="tc-card-name">{def.name}</div>
    <span className="tc-card-check" aria-hidden="true">
      ✓
    </span>
  </button>
);

/* ── Main component ─────────────────────────────────────────────────────── */
const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    themeMode,
    setThemeMode,
    resolvedScheme,
    setColorScheme,
    textSize,
    setTextSize,
  } = useTheme();

  const [saved, setSaved] = useState(false);
  const [colors, setColors] = useState<CustomColors>(loadCustomColors);

  // Local draft state — mirrors context until user hits Apply
  const [localTheme, setLocalTheme] = useState<ThemeMode>(themeMode);
  const [localDark, setLocalDark] = useState(resolvedScheme === "dark");
  const [localFontSize, setLocalFontSize] = useState<TextSize>(textSize);

  // Sync local drafts when context changes externally
  useEffect(() => {
    setLocalTheme(themeMode);
  }, [themeMode]);
  useEffect(() => {
    setLocalDark(resolvedScheme === "dark");
  }, [resolvedScheme]);
  useEffect(() => {
    setLocalFontSize(textSize);
  }, [textSize]);

  // Apply saved custom colors on mount
  useEffect(() => {
    if (localTheme === "modern") applyCustomColors(loadCustomColors());
  }, [localTheme]);

  const updateColor = useCallback(
    (key: keyof CustomColors, val: string) => {
      setColors((prev) => {
        const next = { ...prev, [key]: val };
        if (localTheme === "modern") applyCustomColors(next);
        return next;
      });
    },
    [localTheme],
  );

  const handleApply = useCallback(() => {
    // Push local drafts into ThemeContext (persists to localStorage + API via ThemeSyncBridge)
    setThemeMode(localTheme);
    setColorScheme(localDark ? "dark" : "light");
    setTextSize(localFontSize);

    // Custom color persistence
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(colors));
    } catch {
      /* ignore */
    }
    if (localTheme === "modern") applyCustomColors(colors);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }, [
    localTheme,
    localDark,
    localFontSize,
    colors,
    setThemeMode,
    setColorScheme,
    setTextSize,
  ]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="tc-overlay" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <dialog
        open
        className="tc-panel"
        aria-label="Appearance settings"
        onCancel={(event) => {
          event.preventDefault();
          onClose();
        }}
      >
        {/* Header */}
        <div className="tc-header">
          <span className="tc-title">🎨 Appearance</span>
          <button className="tc-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="tc-body">
          {/* ── Theme selector ── */}
          <div>
            <div className="tc-section-label">Theme</div>
            <div className="tc-theme-grid">
              {THEME_DEFS.map((def) => (
                <ThemeCard
                  key={def.id}
                  def={def}
                  active={localTheme === def.id}
                  onClick={() => setLocalTheme(def.id)}
                />
              ))}
            </div>
          </div>

          {/* ── Dark mode ── */}
          <div>
            <div className="tc-section-label">Display</div>
            <div className="tc-toggle-row">
              <div>
                <div className="tc-toggle-label">Dark Mode</div>
                <div className="tc-toggle-desc">
                  Reduce eye strain in low light
                </div>
              </div>
              <div className="tc-switch">
                <input
                  type="checkbox"
                  checked={localDark}
                  aria-label="Toggle dark mode"
                  onChange={(e) => setLocalDark(e.target.checked)}
                />
                <span className="tc-switch-track" />
              </div>
            </div>
          </div>

          {/* ── Font size ── */}
          <div>
            <div className="tc-section-label">Text Size</div>
            <div className="tc-size-row">
              {(["small", "medium", "large"] as TextSize[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`tc-size-btn${
                    localFontSize === s ? " active" : ""
                  }`}
                  onClick={() => setLocalFontSize(s)}
                >
                  <span className="tc-size-letter">A</span>
                  <span className="tc-size-lbl">
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Custom colors (modern theme only) ── */}
          {localTheme === "modern" && (
            <div>
              <div className="tc-section-label">Custom Colors</div>
              <div className="tc-colors-grid">
                <ColorRow
                  label="Primary"
                  value={colors.primary}
                  onChange={(v) => updateColor("primary", v)}
                />
                <ColorRow
                  label="Accent"
                  value={colors.accent}
                  onChange={(v) => updateColor("accent", v)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer / apply */}
        <div className="tc-footer">
          <button className="tc-apply-btn" onClick={handleApply}>
            <span>Apply &amp; Save</span>
          </button>
          {saved && <div className="tc-saved-badge">✓ Preferences saved</div>}
        </div>
      </dialog>
    </>
  );
};

export default ThemeCustomizer;
