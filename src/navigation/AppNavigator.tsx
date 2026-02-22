import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import type { RootStackParamList, TabParamList } from '../types';
import FeedScreen from '../screens/FeedScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TakeDetailScreen from '../screens/TakeDetailScreen';
import CreateTakeScreen from '../screens/CreateTakeScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Feed: '🏠',
    Notifications: '🔔',
    MyProfile: '👤',
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[label] ?? '●'}
    </Text>
  );
}

function MainTabs({ userId }: { userId: string }) {
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
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen
        name="MyProfile"
        children={() => <ProfileScreen userId={userId} isSelf />}
      />
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
    </Stack.Navigator>
  );
}
