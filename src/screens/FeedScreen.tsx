import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createSupabaseClient } from '../lib/supabase';
import TakeCard from '../components/TakeCard';
import type { Category, RootStackParamList, Take } from '../types';

const supabase = createSupabaseClient();
const CATEGORIES: Array<'all' | Category> = ['all', 'politics', 'sports'];

export default function FeedScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [takes, setTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<'all' | Category>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'trust'>('recent');
  const [error, setError] = useState('');
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  const load = useCallback(
    async (isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError('');

      try {
        let query = supabase
          .from('takes')
          .select(`
            *,
            profiles (id, username),
            sources (id, url, domain, trust_tier, score)
          `)
          .order(sortBy === 'trust' ? 'trust_score' : 'created_at', { ascending: false })
          .limit(40);

        if (category !== 'all') {
          query = query.eq('category', category);
        }

        const { data, error: err } = await query;
        if (err) throw err;

        // Attach user_liked flag
        if (data && myId) {
          const { data: liked } = await supabase
            .from('likes')
            .select('take_id')
            .eq('user_id', myId)
            .in('take_id', data.map((t: Take) => t.id));

          const likedSet = new Set((liked ?? []).map((l: { take_id: string }) => l.take_id));
          setTakes(data.map((t: Take) => ({ ...t, user_liked: likedSet.has(t.id) })));
        } else {
          setTakes(data ?? []);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load takes');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, sortBy, myId]
  );

  useEffect(() => { void load(); }, [load]);

  const handleLike = async (takeId: string, liked: boolean) => {
    if (!myId) return;
    // Optimistic update
    setTakes((prev) =>
      prev.map((t) =>
        t.id === takeId
          ? { ...t, user_liked: !liked, likes_count: t.likes_count + (liked ? -1 : 1) }
          : t
      )
    );

    if (liked) {
      await supabase.from('likes').delete().match({ user_id: myId, take_id: takeId });
    } else {
      await supabase.from('likes').insert({ user_id: myId, take_id: takeId });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>2dpunch</Text>
        <Pressable style={styles.newTakeBtn} onPress={() => nav.navigate('CreateTake')}>
          <Text style={styles.newTakeText}>+ Take</Text>
        </Pressable>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        <View style={styles.filterRow}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c}
              style={[styles.filterPill, category === c && styles.filterActive]}
              onPress={() => setCategory(c)}
            >
              <Text style={[styles.filterText, category === c && styles.filterTextActive]}>
                {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.filterRow}>
          {(['recent', 'trust'] as const).map((s) => (
            <Pressable
              key={s}
              style={[styles.filterPill, sortBy === s && styles.filterActive]}
              onPress={() => setSortBy(s)}
            >
              <Text style={[styles.filterText, sortBy === s && styles.filterTextActive]}>
                {s === 'recent' ? '🕐 Recent' : '🛡 Trust'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={takes}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor="#fff"
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No takes yet. Be the first to post one!</Text>
          }
          renderItem={({ item }) => (
            <TakeCard
              take={item}
              onLike={handleLike}
              onProfile={(uid) => nav.navigate('Profile', { userId: uid })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  logo: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  newTakeBtn: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  newTakeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterActive: { backgroundColor: '#1f6feb', borderColor: '#1f6feb' },
  filterText: { color: '#888', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  list: { padding: 12 },
  empty: { color: '#555', textAlign: 'center', marginTop: 60, fontSize: 15 },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: 40, padding: 16 },
});
