import React, { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { createSupabaseClient } from '../lib/supabase';
import TakeCard from '../components/TakeCard';
import SkeletonCard from '../components/SkeletonCard';
import QuickChallengeSheet from '../components/QuickChallengeSheet';
import type { RootStackParamList, Take } from '../types';
import { parseSupabaseError } from '../lib/errorUtils';

const supabase = createSupabaseClient();

/**
 * Traction score: balances engagement and trust, penalises age.
 * (likes * 0.6 + trust * 0.4) / (age_hours + 2)^1.5
 */
function tractionScore(take: Take): number {
  const ageMs = Date.now() - new Date(take.created_at).getTime();
  const ageHours = ageMs / 3_600_000;
  const engagement = take.likes_count * 0.6 + take.trust_score * 0.4;
  return engagement / Math.pow(ageHours + 2, 1.5);
}

export default function TrendingScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [takes, setTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [myId, setMyId] = useState<string | null>(null);
  const [challengingTake, setChallengingTake] = useState<Take | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setMyId(uid);

      // Fetch last 7 days — traction is only meaningful for recent content
      const since = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();
      const { data, error: err } = await supabase
        .from('takes')
        .select(`
          *,
          profiles (id, username),
          sources (id, url, domain, trust_tier, score)
        `)
        .gte('created_at', since)
        .limit(150);

      if (err) throw new Error(err.message ?? JSON.stringify(err));

      let sorted: Take[] = (data ?? []).sort(
        (a: Take, b: Take) => tractionScore(b) - tractionScore(a)
      );

      if (sorted.length > 0 && uid) {
        const { data: liked } = await supabase
          .from('likes')
          .select('take_id')
          .eq('user_id', uid)
          .in('take_id', sorted.map((t) => t.id));

        const likedSet = new Set((liked ?? []).map((l: { take_id: string }) => l.take_id));
        sorted = sorted.map((t) => ({ ...t, user_liked: likedSet.has(t.id) }));
      }

      setTakes(sorted);
    } catch (e: unknown) {
      setError(parseSupabaseError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleLike = async (takeId: string, liked: boolean) => {
    if (!myId) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const skeletons = Array.from({ length: 5 }, (_, i) => i);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔥 Trending</Text>
        <Text style={styles.subtitle}>Top takes from the last 7 days</Text>
      </View>

      {error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <FlatList
          data={skeletons}
          keyExtractor={(i) => String(i)}
          renderItem={() => <SkeletonCard />}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={takes}
          keyExtractor={(t) => t.id}
          renderItem={({ item, index }) => (
            <View>
              {index < 3 && (
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} #{index + 1}
                  </Text>
                </View>
              )}
              <TakeCard
                take={item}
                onLike={handleLike}
                onProfile={(uid) => nav.navigate('Profile', { userId: uid })}
                onLongPress={(t) => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setChallengingTake(t);
                }}
              />
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#fff" />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No trending takes yet — be the first to post!</Text>
          }
        />
      )}

      <QuickChallengeSheet
        take={challengingTake}
        myId={myId}
        onClose={() => setChallengingTake(null)}
        onPosted={() => { void load(true); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#555', fontSize: 12, marginTop: 2 },
  list: { paddingBottom: 24 },
  rankBadge: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: -4,
    alignSelf: 'flex-start',
  },
  rankText: { color: '#f59e0b', fontWeight: '700', fontSize: 13 },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#ef4444', textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#fff', fontWeight: '600' },
  empty: { color: '#555', textAlign: 'center', marginTop: 60 },
});
