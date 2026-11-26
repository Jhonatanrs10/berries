import '../i18n/i18n';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

import { useColorScheme } from '../components/useColorScheme';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: 'index',
};

// 1. Impede que o splash nativo suma sozinho antes do app carregar
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const resolvedScheme = colorScheme ?? Appearance.getColorScheme() ?? 'light';

  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Configurar a Navigation Bar para Android de forma transparente
  useEffect(() => {
    if (Platform.OS === 'android') {
      async function setTransparentNavBar() {
        try {
          if (typeof NavigationBar.setBackgroundColorAsync === 'function') {
            await NavigationBar.setBackgroundColorAsync('transparent');
          }
          if (typeof NavigationBar.setButtonStyleAsync === 'function') {
            await NavigationBar.setButtonStyleAsync(
              resolvedScheme === 'dark' ? 'light' : 'dark'
            );
          }
          if (typeof NavigationBar.setBehaviorAsync === 'function') {
            await NavigationBar.setBehaviorAsync('inset-swipe');
          }
        } catch (e) {
          console.log('Erro ao configurar navigation bar:', e);
        }
      }
      setTransparentNavBar();
    }
  }, [resolvedScheme]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // 2. Esconde o splash screen assim que as fontes carregarem
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {
        // Ignora caso já tenha sido oculto
      });
    }
  }, [loaded]);

  // Se as fontes não carregaram, retornamos null para o nativo continuar segurando a tela
  if (!loaded) {
    return null;
  }

  return <RootLayoutNav resolvedScheme={resolvedScheme} />;
}

function RootLayoutNav({ resolvedScheme }: { resolvedScheme: 'light' | 'dark' }) {
  const barStyle = resolvedScheme === 'dark' ? 'light' : 'dark';

  return (
    <>
      <StatusBar
        style={barStyle}
        animated={false}
      />
      <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(animes)" />
          <Stack.Screen name="(finance)" />
          <Stack.Screen name="(market)" />
          <Stack.Screen name="(todo)" />
        </Stack>
      </ThemeProvider>
    </>
  );
}