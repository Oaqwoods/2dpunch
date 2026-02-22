import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createSupabaseClient } from '../lib/supabase';
import type { Notification, RootStackParamList } from '../types';

const supabase = createSupabaseClient();

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    if (!myId) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:actor_id (id, username),
        take:take_id (id, body, category)
      `)
      .eq('user_id', myId)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications(data ?? []);
    setLoading(false);

    // Mark all as read
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', myId)
      .eq('read', false);
  }, [myId]);

  useEffect(() => { if (myId) void load(); }, [myId, load]);

  const handlePress = (n: Notification) => {
    if (n.take_id) {
      nav.navigate('TakeDetail', { takeId: n.take_id });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#fff" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
      </View>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No notifications yet</Text>
        }
        renderItem={({ item: n }) => (
          <Pressable
            style={[styles.notif, !n.read && styles.notifUnread]}
            onPress={() => handlePress(n)}
          >
            <View style={styles.notifIcon}>
              <Text style={styles.iconText}>
                {n.type === 'challenge' ? '⚔️' : '❤️'}
              </Text>
            </View>
            <View style={styles.notifContent}>
              <Text style={styles.notifText}>
                <Text style={styles.actor}>@{(n.actor as { username: string } | undefined)?.username ?? '…'}</Text>
                {n.type === 'challenge'
                  ? ' challenged your take'
                  : ' liked your take'}
              </Text>
              {n.take && (
                <Text style={styles.takePreview} numberOfLines={1}>
                  "{(n.take as { body: string }).body}"
                </Text>
              )}
              <Text style={styles.time}>{timeAgo(n.created_at)}</Text>
            </View>
            {!n.read && <View style={styles.unreadDot} />}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
  list: { padding: 12, gap: 2, paddingBottom: 40 },
  notif: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  notifUnread: { backgroundColor: '#1a1a2a' },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  notifContent: { flex: 1, gap: 3 },
  notifText: { color: '#e8e8e8', fontSize: 14, lineHeight: 20 },
  actor: { color: '#a0c4ff', fontWeight: '600' },
  takePreview: { color: '#666', fontSize: 13, fontStyle: 'italic' },
  time: { color: '#555', fontSize: 12, marginTop: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1f6feb',
    marginTop: 6,
  },
  empty: { color: '#555', textAlign: 'center', marginTop: 60, fontSize: 15 },
});
