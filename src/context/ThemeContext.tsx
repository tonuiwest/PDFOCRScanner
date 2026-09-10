import React, { createContext, useState, useMemo, useCallback, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  background: string; backgroundAlt: string; card: string; cardElevated: string;
  primary: string; primaryDark: string; accent: string; accentSoft: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  border: string; borderLight: string; success: string; error: string; warning: string; shadow: string;
}
export interface Theme { colors: ThemeColors; isDark: boolean; }

// Classic, professional palette: deep navy ink + muted brass/gold, on a warm
// ivory "paper" ground in light mode.
const lightPalette: ThemeColors = {
  background: '#F8F4E9', backgroundAlt: '#EFE8D6', card: '#FFFEFA', cardElevated: '#FFFFFF',
  primary: '#152A4E', primaryDark: '#0B1830', accent: '#A9822F', accentSoft: 'rgba(169,130,47,0.12)',
  textPrimary: '#1E2433', textSecondary: '#5C6072', textMuted: '#98937F',
  border: '#E2D9BE', borderLight: '#EDE6D2', success: '#2F7D5C', error: '#A93E33', warning: '#A9822F', shadow: '#2B2311',
};
const darkPalette: ThemeColors = {
  background: '#0D1220', backgroundAlt: '#141B2E', card: '#171F35', cardElevated: '#1D2740',
  primary: '#4A5C85', primaryDark: '#2B3A5E', accent: '#D4B36A', accentSoft: 'rgba(212,179,106,0.14)',
  textPrimary: '#EDEFF5', textSecondary: '#A6ADC0', textMuted: '#6B7488',
  border: '#232D48', borderLight: '#2A3550', success: '#4FA787', error: '#E0776E', warning: '#D4B36A', shadow: '#000000',
};

interface ThemeContextType { theme: Theme; darkMode: boolean; themeMode: 'light'|'dark'|'system'; toggleDarkMode: () => void; setThemeMode: (m:'light'|'dark'|'system')=>void; }
const ThemeContext = createContext<ThemeContextType>({
  theme: { colors: lightPalette, isDark: false }, darkMode: false, themeMode: 'light', toggleDarkMode: ()=>{}, setThemeMode: ()=>{}
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<'light'|'dark'|'system'>('system');
  const [darkMode, setDarkMode] = useState(systemScheme === 'dark');
  const [hydrated, setHydrated] = useState(false);

  // Load persisted preference once on mount.
  useEffect(() => {
    (async () => {
      const s = await AsyncStorage.getItem('theme');
      if (s === 'dark' || s === 'light' || s === 'system') {
        setThemeModeState(s);
        if (s === 'dark') setDarkMode(true);
        else if (s === 'light') setDarkMode(false);
        else setDarkMode(systemScheme === 'dark');
      }
      setHydrated(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep in sync with OS appearance changes while in "system" mode.
  useEffect(() => {
    if (themeMode === 'system') setDarkMode(systemScheme === 'dark');
  }, [systemScheme, themeMode]);

  const theme = useMemo<Theme>(() => ({ colors: darkMode ? darkPalette : lightPalette, isDark: darkMode }), [darkMode]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      const mode = next ? 'dark' : 'light';
      setThemeModeState(mode);
      AsyncStorage.setItem('theme', mode);
      return next;
    });
  }, []);

  // Single source of truth for changing theme mode - always routes through here
  // so every screen (Settings included) stays correctly in sync.
  const setThemeMode = useCallback((mode: 'light' | 'dark' | 'system') => {
    setThemeModeState(mode);
    AsyncStorage.setItem('theme', mode);
    if (mode === 'dark') setDarkMode(true);
    else if (mode === 'light') setDarkMode(false);
    else setDarkMode(systemScheme === 'dark');
  }, [systemScheme]);

  const value = useMemo(() => ({ theme, darkMode, themeMode, toggleDarkMode, setThemeMode }), [theme, darkMode, themeMode]);
  // Avoid a light->dark flash: don't render children until the persisted theme has loaded.
  if (!hydrated) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
export const useTheme = () => useContext(ThemeContext);
