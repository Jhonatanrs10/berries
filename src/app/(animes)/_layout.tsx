import '../../i18n/i18n';
import { useTranslation } from 'react-i18next';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

export default function Layout() {
  const { t } = useTranslation(); // Adicione esta linha
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <Tabs
      screenOptions={{
        headerShown: true, // Oculta o cabeçalho padrão, se desejar
        tabBarActiveTintColor: colors.button_selected, // Cor do ícone/texto da aba ativa
        tabBarInactiveTintColor: colors.button_default, // Cor do ícone/texto da aba inativa
        headerShadowVisible: true,
        headerTitleStyle: {
        color: colors.text_primary, // Garante a cor do título especificamente
        fontWeight: 'bold',         // Exemplo: deixa em negrito
        fontSize: 24,              // Tamanho da fonte
        },
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: colors.background_tab, // Cor de fundo da barra de abas
          borderTopColor: colors.border, // Cor da borda superior da barra de abas
          //elevation: 0, // Garante remoção de sombra no Android
          //shadowOpacity: 0, // Garante remoção de sombra no iOS
        },
        headerStyle: {
          borderBottomWidth: 0, // Largura da borda inferior (fina)
          backgroundColor: colors.background_header,
          borderBottomColor: colors.border,
          //elevation: 0, // Remove elevação/sombra no Android
          //shadowOpacity: 0, // Remove sombra no iOS
          //shadowOffset: { width: 0, height: 0 }, // Zera o deslocamento da sombra (iOS)
          //shadowRadius: 0, // Zera o desfoque da sombra (iOS)
        },
        // Adicione esta propriedade para ocultar o rótulo de texto
        tabBarShowLabel: false,

        //headerTitle: 'Animes', // Este é o título padrão, pode ser ajustado para ser mais genérico ou removido.
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('anime_tab.index'),
          tabBarIcon: ({ color }) => <FontAwesome name="bars" size={30} color={color} />
        }}
      />
      <Tabs.Screen
        name="input"
        options={{
          title: t('anime_tab.input'),
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="plus-circle" size={30} color={color} />
        }}
      />

      <Tabs.Screen
        name="import"
        options={{
          title: t('anime_tab.import'),
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="cog" size={30} color={color} />
        }}
      />
    </Tabs>
  );
}