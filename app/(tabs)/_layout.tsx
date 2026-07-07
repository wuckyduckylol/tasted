import { Tabs } from 'expo-router';
import { CircleUserRound, House, ListOrdered, Search, Sparkles } from 'lucide-react-native';

import { colors, fonts } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        // Candy header band ties every tab back to the intro screen's vibe.
        headerStyle: { backgroundColor: colors.candy },
        headerTintColor: colors.baseDark,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 22, color: colors.baseDark },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.base, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.base },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'tasted',
          tabBarLabel: 'home',
          tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'search',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="ranks"
        options={{
          title: 'your ranks',
          tabBarLabel: 'ranks',
          tabBarIcon: ({ color, size }) => (
            <ListOrdered color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="drops"
        options={{
          title: 'drops',
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'profile',
          tabBarIcon: ({ color, size }) => (
            <CircleUserRound color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
