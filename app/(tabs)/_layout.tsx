import { Tabs } from 'expo-router';
import {
  CircleUserRound,
  House,
  ListOrdered,
  Search,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, fonts, radii } from '@/lib/theme';

/** Icon + 4px active dot underneath (handoff 3a tab bar: no labels). */
function TabIcon({ icon: Icon, color, focused }: { icon: LucideIcon; color: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <Icon color={color} size={23} strokeWidth={2} />
      <View style={[styles.dot, { backgroundColor: focused ? colors.accent : 'transparent' }]} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.candy },
        headerTintColor: colors.baseDark,
        headerTitleStyle: { fontFamily: fonts.display, fontSize: 22, color: colors.baseDark },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
        tabBarStyle: { backgroundColor: colors.base, borderTopColor: colors.track },
        sceneStyle: { backgroundColor: colors.base },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'tasted',
          headerShown: false, // home owns its top (candy hero)
          tabBarIcon: ({ color, focused }) => <TabIcon icon={House} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'search',
          headerShown: false, // in-screen Baloo title per handoff 4e
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Search} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ranks"
        options={{
          title: 'your ranks',
          headerShown: false, // in-screen title per handoff 4f
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={ListOrdered} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="drops"
        options={{
          title: 'drops',
          headerShown: false, // in-screen title per handoff 4g
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Sparkles} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'profile',
          headerShown: false, // identity row owns the top per handoff 4h
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={CircleUserRound} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', gap: 3, paddingTop: 6 },
  dot: { width: 4, height: 4, borderRadius: radii.pill },
});
