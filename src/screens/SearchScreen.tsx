import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createSupabaseClient } from '../lib/supabase';
import TakeCard from '../components/TakeCard';
import TrustBadge from '../components/TrustBadge';
import type { Profile, RootStackParamList, Take } from '../types';

const supabase = createSupabaseClient();

type ResultItem =
  | { kind: 'take'; data: Take }
  | { kind: 'user'; data: Profile }
  | { kind: 'header'; label: string };

export default function SearchScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const pattern = `%${trimmed}%`;

    const [takesRes, usersRes] = await Promise.all([
      supabase
        .from('takes')
        .select('*, profiles(id, username), sources(id, url, domain, trust_tier, score)')
        .ilike('body', pattern)
        .order('trust_score', { ascending: false })
        .limit(20),
      supabase
        .from('profiles')
        .select('*')
        .ilike('username', pattern)
        .limit(10),
    ]);

    const items: ResultItem[] = [];
    const takes: Take[] = takesRes.data ?? [];
    const users: Profile[] = usersRes.data ?? [];

    if (users.length > 0) {
      items.push({ kind: 'header', label: 'People' });
      users.forEach((u) => items.push({ kind: 'user', data: u }));
    }
    if (takes.length > 0) {
      items.push({ kind: 'header', label: 'Takes' });
      takes.forEach((t) => items.push({ kind: 'take', data: t }));
    }
    if (takes.length === 0 && users.length === 0) {
      items.push({ kind: 'header', label: 'No results' });
    }

    setResults(items);
    setLoading(false);
  }, []);

  function handleChange(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(text), 350);
  }

  function renderItem({ item }: { item: ResultItem }) {
    if (item.kind === 'header') {
      return <Text style={styles.sectionHeader}>{item.label}</Text>;
    }
    if (item.kind === 'user') {
      return (
        <Pressable
          style={styles.userRow}
          onPress={() => nav.navigate('Profile', { userId: item.data.id })}
        >
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {item.data.username?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username}>@{item.data.username}</Text>
            {!!item.data.bio && (
              <Text style={styles.userBio} numberOfLines={1}>{item.data.bio}</Text>
            )}
          </View>
          <TrustBadge score={item.data.avg_trust_score} size="sm" />
        </Pressable>
      );
    }
    // take
    return (
      <TakeCard
        take={item.data}
        onLike={() => {}}
        onProfile={(uid) => nav.navigate('Profile', { userId: uid })}
        onLongPress={() => nav.navigate('TakeDetail', { takeId: item.data.id })}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="Search takes and people…"
          placeholderTextColor="#444"
          value={query}
          onChangeText={handleChange}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {loading && <ActivityIndicator size="small" color="#888" style={{ marginLeft: 8 }} />}
      </View>

      {query.trim().length < 2 && results.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔎</Text>
          <Text style={styles.emptyText}>Search for takes or people</Text>
          <Text style={styles.emptySubtext}>Type at least 2 characters to search</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item, i) =>
          item.kind === 'header' ? `h-${i}` :
          item.kind === 'user' ? `u-${item.data.id}` :
          `t-${item.data.id}`
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: {
    flex: 1,
    color: '#fff',
    paddingVertical: 12,
    fontSize: 15,
  },
  list: { paddingHorizontal: 12, paddingBottom: 40 },
  sectionHeader: {
    color: '#555',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f6feb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1, gap: 2 },
  username: { color: '#a0c4ff', fontWeight: '600', fontSize: 14 },
  userBio: { color: '#666', fontSize: 12 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 100 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#888', fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 13 },
});
