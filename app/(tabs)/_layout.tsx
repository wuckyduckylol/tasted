import { Tabs } from 'expo-router';
import { CircleUserRound, House, Search, Sparkles } from 'lucide-react-native';

import { colors, fonts } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.base },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 20 },
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
          title: 'Home',
          tabBarIcon: ({ color, size }) => <House color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="drops"
        options={{
          title: 'Drops',
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <CircleUserRound color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
