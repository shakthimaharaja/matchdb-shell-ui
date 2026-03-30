/**
 * ThemeSyncBridge — headless component that loads user preferences
 * from the API on login and saves changes back (debounced).
 *
 * Rendered inside <ThemeProvider> + <Provider> so it has access to both.
 */
import { useEffect, useRef } from "react";
import { useTheme } from "matchdb-component-library";
import { useAppSelector } from "../store";
import {
  useLazyGetPreferencesQuery,
  useUpdatePreferencesMutation,
} from "../api/shellApi";

const ThemeSyncBridge: React.FC = () => {
  const { setAll, themeMode, colorScheme, textSize } = useTheme();
  const token = useAppSelector((s) => s.auth.token);
  const [fetchPrefs] = useLazyGetPreferencesQuery();
  const [savePrefs] = useUpdatePreferencesMutation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);
  const skipNextSaveRef = useRef(false);

  // Load prefs from API when user logs in
  useEffect(() => {
    if (!token) {
      loadedRef.current = false;
      return;
    }
    if (loadedRef.current) return;
    loadedRef.current = true;

    fetchPrefs()
      .unwrap()
      .then((prefs) => {
        skipNextSaveRef.current = true;
        setAll(prefs);
      })
      .catch(() => {
        /* offline or first-time user — keep localStorage defaults */
      });
  }, [token, fetchPrefs, setAll]);

  // Debounced save when prefs change
  useEffect(() => {
    if (!token || !loadedRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      savePrefs({ themeMode, colorScheme, textSize }).catch(() => {
        /* silent */
      });
    }, 800);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [token, themeMode, colorScheme, textSize, savePrefs]);

  return null; // headless
};

export default ThemeSyncBridge;
