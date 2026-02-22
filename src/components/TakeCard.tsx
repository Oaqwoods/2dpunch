import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Take, RootStackParamList } from '../types';
import TrustBadge from './TrustBadge';

interface Props {
  take: Take;
  onLike: (takeId: string, liked: boolean) => void;
  onProfile: (userId: string) => void;
  onLongPress?: (take: Take) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function TakeCard({ take, onLike, onProfile, onLongPress }: Props) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => nav.navigate('TakeDetail', { takeId: take.id })}
      onLongPress={() => onLongPress?.(take)}
      delayLongPress={350}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => onProfile(take.user_id)}>
          <Text style={styles.username}>
            @{take.profiles?.username ?? '…'}
          </Text>
        </Pressable>
        <View style={styles.headerRight}>
          <View style={[styles.categoryPill, take.category === 'politics' ? styles.politics : styles.sports]}>
            <Text style={[styles.categoryText, take.category === 'politics' ? styles.categoryPolitics : styles.categorySports]}>
              {take.category}
            </Text>
          </View>
          <Text style={styles.time}>{timeAgo(take.created_at)}</Text>
        </View>
      </View>

      {/* Body */}
      <Text style={styles.body} numberOfLines={4}>{take.body}</Text>

      {/* Tags */}
      {take.tags?.length > 0 && (
        <View style={styles.tags}>
          {take.tags.map((t) => (
            <Text key={t} style={styles.tag}>#{t}</Text>
          ))}
        </View>
      )}

      {/* Trust badge */}
      <TrustBadge score={take.trust_score} size="sm" />

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          style={styles.footerBtn}
          onPress={() => onLike(take.id, !!take.user_liked)}
          hitSlop={8}
        >
          <Text style={[styles.footerIcon, take.user_liked && styles.liked]}>
            {take.user_liked ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.footerCount}>{take.likes_count}</Text>
        </Pressable>

        <Pressable
          style={styles.footerBtn}
          onPress={() => nav.navigate('TakeDetail', { takeId: take.id })}
          hitSlop={8}
        >
          <Text style={styles.footerIcon}>⚔️</Text>
          <Text style={styles.footerCount}>{take.challenges_count}</Text>
        </Pressable>

        {take.sources && take.sources.length > 0 && (
          <View style={styles.footerBtn}>
            <Text style={styles.footerIcon}>📎</Text>
            <Text style={styles.footerCount}>{take.sources.length}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardPressed: { opacity: 0.85 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  username: { color: '#a0c4ff', fontWeight: '600', fontSize: 13 },
  time: { color: '#555', fontSize: 12 },
  categoryPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  politics: { backgroundColor: '#3d1117' },
  sports: { backgroundColor: '#0d2b2a' },
  categoryText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  categoryPolitics: { color: '#e63946' },
  categorySports: { color: '#2ec4b6' },
  body: { color: '#e8e8e8', fontSize: 15, lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { color: '#888', fontSize: 12 },
  footer: { flexDirection: 'row', gap: 16, marginTop: 2 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerIcon: { fontSize: 15 },
  footerCount: { color: '#888', fontSize: 13 },
  liked: {},
});
