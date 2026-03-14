import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createSupabaseClient } from '../lib/supabase';
import type { RootStackParamList, TabParamList } from '../types';

const supabase = createSupabaseClient();
import FeedScreen from '../screens/FeedScreen';
import TrendingScreen from '../screens/TrendingScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TakeDetailScreen from '../screens/TakeDetailScreen';
import CreateTakeScreen from '../screens/CreateTakeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SuggestSourceScreen from '../screens/SuggestSourceScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Feed: '🏠',
    Trending: '🔥',
    Notifications: '🔔',
    MyProfile: '👤',
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[label] ?? '●'}
    </Text>
  );
}

function SettingsButton() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  return (
    <Pressable
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, paddingHorizontal: 12 })}
      onPress={() => nav.navigate('Settings')}
    >
      <Text style={{ fontSize: 20 }}>⚙️</Text>
    </Pressable>
  );
}

function MainTabs({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);
      setUnreadCount(count ?? 0);
    };

    void fetchUnread();

    const channel = supabase
      .channel(`notif-badge-${userId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { void fetchUnread(); }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { void fetchUnread(); }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarLabel: route.name === 'MyProfile' ? 'Profile' : route.name,
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0f0f0f', borderTopColor: '#1a1a1a' },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#555',
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Trending" component={TrendingScreen} />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
      <Tab.Screen
        name="MyProfile"
        options={{ headerShown: true, headerTitle: 'Profile', headerRight: () => <SettingsButton />, headerStyle: { backgroundColor: '#0f0f0f' }, headerTintColor: '#fff' }}
      >
        {() => <ProfileScreen userId={userId} isSelf />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function AppNavigator({ userId }: { userId: string }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0f0f0f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#0f0f0f' },
      }}
    >
      <Stack.Screen name="Main" options={{ headerShown: false }}>
        {() => <MainTabs userId={userId} />}
      </Stack.Screen>
      <Stack.Screen
        name="TakeDetail"
        component={TakeDetailScreen}
        options={{ title: 'Take' }}
      />
      <Stack.Screen
        name="CreateTake"
        component={CreateTakeScreen}
        options={{ title: 'New Take', presentation: 'modal' }}
      />
      <Stack.Screen
        name="Profile"
        options={{ title: 'Profile' }}
      >
        {(props) => (
          <ProfileScreen
            userId={props.route.params.userId}
            isSelf={props.route.params.userId === userId}
          />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings', presentation: 'modal' }}
      />
      <Stack.Screen
        name="SuggestSource"
        component={SuggestSourceScreen}
        options={{ title: 'Suggest a Source' }}
      />
    </Stack.Navigator>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _styles = StyleSheet.create({});
