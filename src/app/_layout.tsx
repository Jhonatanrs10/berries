import '../i18n/i18n';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';

import { useColorScheme } from '../components/useColorScheme';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

// 1. Impede que o splash nativo suma sozinho antes do app carregar
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Configurar a Navigation Bar para Android de forma transparente
  useEffect(() => {
    if (Platform.OS === 'android') {
      async function setTransparentNavBar() {
        try {
          await NavigationBar.setBackgroundColorAsync('transparent');
          await NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark');
          await NavigationBar.setBehaviorAsync('inset-swipe');
        } catch (e) {
          console.log('Erro ao configurar navigation bar:', e);
        }
      }
      setTransparentNavBar();
    }
  }, [colorScheme]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // 2. Assim que as fontes carregarem, escondemos o splash nativo com elegância
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

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(animes)" options={{ headerShown: false }} />
        <Stack.Screen name="(finance)" options={{ headerShown: false }} />
        <Stack.Screen name="(market)" options={{ headerShown: false }} />
        <Stack.Screen name="(todo)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}