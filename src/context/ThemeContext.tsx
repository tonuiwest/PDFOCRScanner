import React, { createContext, useState, useMemo, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export interface ThemeColors {
  background: string; surface: string; surfaceAlt: string;
  primary: string; primarySoft: string; onPrimary: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  border: string; success: string; successSoft: string; danger: string; dangerSoft: string;
  warning: string; warningSoft: string; overlay: string; shadow: string;
}
export interface Theme { colors: ThemeColors; isDark: boolean; }
export type ThemeMode = 'light' | 'dark' | 'system';

/** Accent colour presets: [light primary, light soft, dark primary, dark soft]. */
export const ACCENTS = {
  blue: { label: 'Ocean', swatch: '#3D5AFE', light: ['#3D5AFE', '#E8ECFF'], dark: ['#7088FF', '#1F2747'] },
  violet: { label: 'Violet', swatch: '#7C3AED', light: ['#7C3AED', '#F1E9FF'], dark: ['#A47BFF', '#2A1F45'] },
  teal: { label: 'Teal', swatch: '#0D9488', light: ['#0D9488', '#DDF5F2'], dark: ['#2CC7B8', '#123230'] },
  green: { label: 'Forest', swatch: '#16A34A', light: ['#15803D', '#E2F6E8'], dark: ['#4ADE80', '#15301F'] },
  orange: { label: 'Sunset', swatch: '#EA580C', light: ['#E2530A', '#FFEDE2'], dark: ['#FF8A4C', '#3A2213'] },
  rose: { label: 'Rose', swatch: '#E11D48', light: ['#DB1D47', '#FFE6EC'], dark: ['#FF6B8B', '#3A1622'] },
  slate: { label: 'Graphite', swatch: '#334155', light: ['#334155', '#E6EAF0'], dark: ['#A5B4C8', '#232B38'] },
} as const;
export type AccentKey = keyof typeof ACCENTS;

const light: ThemeColors = {
  background: '#F5F6FA', surface: '#FFFFFF', surfaceAlt: '#EEF0F6',
  primary: '#3D5AFE', primarySoft: '#E8ECFF', onPrimary: '#FFFFFF',
  textPrimary: '#121826', textSecondary: '#4B5468', textMuted: '#8A93A6',
  border: '#E3E6EE', success: '#14935C', successSoft: '#E3F5EC', danger: '#D93B3B', dangerSoft: '#FDEBEB',
  warning: '#C77700', warningSoft: '#FFF3DF', overlay: 'rgba(10,14,25,0.55)', shadow: '#1B2440',
};
const dark: ThemeColors = {
  background: '#0B0E16', surface: '#151A26', surfaceAlt: '#1D2332',
  primary: '#7088FF', primarySoft: '#1F2747', onPrimary: '#FFFFFF',
  textPrimary: '#F1F3F9', textSecondary: '#B3BACB', textMuted: '#737C91',
  border: '#262D3D', success: '#3CC48A', successSoft: '#13291F', danger: '#F06A6A', dangerSoft: '#2E1717',
  warning: '#F2A93B', warningSoft: '#2E2311', overlay: 'rgba(0,0,0,0.65)', shadow: '#000000',
};

interface ThemeContextType {
  theme: Theme; themeMode: ThemeMode; setThemeMode: (m: ThemeMode) => void;
  accent: AccentKey; setAccent: (a: AccentKey) => void;
}
const ThemeContext = createContext<ThemeContextType>({
  theme: { colors: light, isDark: false }, themeMode: 'system', setThemeMode: () => {}, accent: 'blue', setAccent: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const [themeMode, setMode] = useState<ThemeMode>('system');
  const [accent, setAccentState] = useState<AccentKey>('blue');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(['theme', 'accent'])
      .then(([[, t], [, a]]) => {
        if (t === 'dark' || t === 'light' || t === 'system') setMode(t);
        if (a && a in ACCENTS) setAccentState(a as AccentKey);
      })
      .finally(() => setHydrated(true));
  }, []);

  const isDark = themeMode === 'system' ? system === 'dark' : themeMode === 'dark';
  const value = useMemo<ThemeContextType>(() => {
    const [primary, primarySoft] = ACCENTS[accent][isDark ? 'dark' : 'light'];
    return {
      theme: { colors: { ...(isDark ? dark : light), primary, primarySoft }, isDark },
      themeMode,
      setThemeMode: (m) => { setMode(m); AsyncStorage.setItem('theme', m).catch(() => {}); },
      accent,
      setAccent: (a) => { setAccentState(a); AsyncStorage.setItem('accent', a).catch(() => {}); },
    };
  }, [isDark, themeMode, accent]);

  // Avoid a colour flash: render nothing until stored preferences are read.
  if (!hydrated) return null;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
export const useTheme = () => useContext(ThemeContext);
