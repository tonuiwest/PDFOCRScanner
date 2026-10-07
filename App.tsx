import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from './src/context/ThemeContext';
import { ToastProvider } from './src/components/ui';
import { adsManager } from './src/services/adsManager';
import type { RootStackParamList } from './src/navigation';
import HomeScreen from './src/screens/HomeScreen';
import EditorScreen from './src/screens/EditorScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import TextScreen from './src/screens/TextScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { theme } = useTheme();
  const c = theme.colors;

  useEffect(() => { adsManager.start(); }, []);

  const base = theme.isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: c.background, card: c.surface, text: c.textPrimary, border: c.border, primary: c.primary },
  };

  return (
    <ToastProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: c.background } }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Editor" component={EditorScreen} />
          <Stack.Screen name="Documents" component={DocumentsScreen} />
          <Stack.Screen name="Text" component={TextScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ToastProvider>
  );
}
