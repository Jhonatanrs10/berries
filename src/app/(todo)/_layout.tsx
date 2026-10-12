import '../../i18n/i18n';
import { useTranslation } from 'react-i18next';
import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../components/useColorScheme';

export default function Layout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.button_selected,
        tabBarInactiveTintColor: colors.button_default,
        headerShadowVisible: true,
        headerTitleStyle: {
          color: colors.text_primary,
          fontWeight: 'bold',
          fontSize: 24,
        },
        tabBarStyle: {
          borderTopWidth: 0,
          backgroundColor: colors.background_tab,
          borderTopColor: colors.border,
        },
        headerStyle: {
          borderBottomWidth: 0,
          backgroundColor: colors.background_header,
          borderBottomColor: colors.border,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tarefas',
          tabBarIcon: ({ color }) => <FontAwesome name="bars" size={30} color={color} />
        }}
      />
      <Tabs.Screen
        name="input"
        options={{
          title: 'Nova Tarefa',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="plus-circle" size={30} color={color} />
        }}
      />

      <Tabs.Screen
        name="import"
        options={{
          title: 'Resumo e Dados',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="cog" size={30} color={color} />
        }}
      />
    </Tabs>
  );
}