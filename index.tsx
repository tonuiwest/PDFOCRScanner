import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import App from './App';
import { ThemeProvider } from './src/context/ThemeContext';

const Root = () => (
  <SafeAreaProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </SafeAreaProvider>
);

registerRootComponent(Root);
