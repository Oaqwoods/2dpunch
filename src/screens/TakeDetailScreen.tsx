import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createSupabaseClient } from '../lib/supabase';
import { extractDomain, scoreDomain, calcAverageTrust, tierColor, trustColor } from '../lib/trustScore';
import TrustBadge from '../components/TrustBadge';
import type { Challenge, RootStackParamList, Source, Take } from '../types';

const supabase = createSupabaseClient();
type Props = NativeStackScreenProps<RootStackParamList, 'TakeDetail'>;

interface PendingSource { url: string; domain: string; tier: string; score: number; }

export default function TakeDetailScreen({ route, navigation }: Props) {
  const { takeId } = route.params;
  const [take, setTake] = useState<Take | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Challenge form
  const [showForm, setShowForm] = useState(false);
  const [challengeBody, setChallengeBody] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [pendingSources, setPendingSources] = useState<PendingSource[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const previewScore = calcAverageTrust(pendingSources.map((s) => s.score));

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [takeRes, challengeRes] = await Promise.all([
        supabase
          .from('takes')
          .select('*, profiles(id, username), sources(*)')
          .eq('id', takeId)
          .single(),
        supabase
          .from('challenges')
          .select('*, profiles(id, username), challenge_sources(*)')
          .eq('take_id', takeId)
          .order('trust_score', { ascending: false }),
      ]);
      if (takeRes.error) throw takeRes.error;
      setTake(takeRes.data);
      setChallenges(challengeRes.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [takeId]);

  useEffect(() => { void load(); }, [load]);

  function addSource() {
    const url = sourceUrl.trim();
    if (!url) return;
    if (pendingSources.length >= 5) { setFormError('Max 5 sources'); return; }
    try { new URL(url); } catch { setFormError('Enter a valid URL'); return; }
    const domain = extractDomain(url);
    const { tier, score } = scoreDomain(domain);
    setPendingSources((p) => [...p, { url, domain, tier, score }]);
    setSourceUrl('');
    setFormError('');
  }

  async function submitChallenge() {
    setFormError('');
    if (!challengeBody.trim()) { setFormError('Write your challenge'); return; }
    if (challengeBody.length > 500) { setFormError('Max 500 chars'); return; }
    if (!myId) return;

    setSubmitting(true);
    try {
      const { data: challenge, error: cErr } = await supabase
        .from('challenges')
        .insert({
          take_id: takeId,
          user_id: myId,
          body: challengeBody.trim(),
          trust_score: previewScore,
        })
        .select()
        .single();

      if (cErr) throw cErr;

      if (pendingSources.length > 0) {
        await supabase.from('challenge_sources').insert(
          pendingSources.map((s) => ({
            challenge_id: challenge.id,
            url: s.url,
            domain: s.domain,
            trust_tier: s.tier,
            score: s.score,
          }))
        );
        await supabase.rpc('refresh_challenge_trust_score', { p_challenge_id: challenge.id });
      }

      setChallengeBody('');
      setPendingSources([]);
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to challenge';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setFormError('You already challenged this take');
      } else if (msg.includes('policy') || msg.includes('row-level')) {
        setFormError('Rate limit reached or you can\'t challenge your own take');
      } else {
        setFormError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#fff" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (error || !take) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error || 'Take not found'}</Text>
      </SafeAreaView>
    );
  }

  const alreadyChallenged = challenges.some((c) => c.user_id === myId);
  const isOwner = take.user_id === myId;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>

          {/* ── TAKE ── */}
          <View style={styles.takeCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.username}>@{take.profiles?.username}</Text>
              <View style={[styles.catPill, take.category === 'politics' ? styles.polCat : styles.spoCat]}>
                <Text style={styles.catText}>{take.category}</Text>
              </View>
            </View>
            <Text style={styles.takeBody}>{take.body}</Text>
            {take.tags?.length > 0 && (
              <View style={styles.tags}>
                {take.tags.map((t) => <Text key={t} style={styles.tag}>#{t}</Text>)}
              </View>
            )}
            <TrustBadge score={take.trust_score} />

            {/* Sources */}
            {take.sources && take.sources.length > 0 && (
              <View style={styles.sourcesBox}>
                <Text style={styles.sourcesTitle}>📎 Receipts</Text>
                {take.sources.map((s: Source) => (
                  <View key={s.id} style={styles.sourceItem}>
                    <View style={[styles.tierDot, { backgroundColor: tierColor(s.trust_tier) }]} />
                    <Text style={styles.sourceDomain}>{s.domain}</Text>
                    <Text style={[styles.sourceTier, { color: tierColor(s.trust_tier) }]}>
                      {s.trust_tier} · {s.score}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.stats}>
              <Text style={styles.stat}>❤️ {take.likes_count}</Text>
              <Text style={styles.stat}>⚔️ {take.challenges_count} challenges</Text>
            </View>
          </View>

          {/* ── CHALLENGE BUTTON ── */}
          {!isOwner && !alreadyChallenged && (
            <Pressable
              style={styles.challengeBtn}
              onPress={() => setShowForm((v) => !v)}
            >
              <Text style={styles.challengeBtnText}>
                {showForm ? '✕ Cancel Challenge' : '⚔️ Challenge This Take'}
              </Text>
            </Pressable>
          )}
          {alreadyChallenged && (
            <Text style={styles.alreadyChallenged}>You've already challenged this take</Text>
          )}

          {/* ── CHALLENGE FORM ── */}
          {showForm && (
            <View style={styles.challengeForm}>
              <Text style={styles.formTitle}>Your Counter-Take</Text>
              <TextInput
                style={styles.challengeInput}
                placeholder="Make your case..."
                placeholderTextColor="#444"
                multiline
                value={challengeBody}
                onChangeText={setChallengeBody}
                maxLength={500}
              />
              <Text style={styles.label}>Add Receipts</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.smallInput, { flex: 1 }]}
                  placeholder="https://..."
                  placeholderTextColor="#444"
                  value={sourceUrl}
                  onChangeText={setSourceUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                  onSubmitEditing={addSource}
                />
                <Pressable style={styles.addBtn} onPress={addSource}>
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              </View>
              {pendingSources.map((s, i) => (
                <View key={i} style={styles.sourceItem}>
                  <View style={[styles.tierDot, { backgroundColor: tierColor(s.tier as 'high' | 'mid' | 'low') }]} />
                  <Text style={styles.sourceDomain}>{s.domain}</Text>
                  <Text style={[styles.sourceTier, { color: tierColor(s.tier as 'high' | 'mid' | 'low') }]}>
                    {s.tier} · {s.score}
                  </Text>
                  <Pressable onPress={() => setPendingSources((p) => p.filter((_, j) => j !== i))}>
                    <Text style={styles.removeBtn}>✕</Text>
                  </Pressable>
                </View>
              ))}
              {pendingSources.length > 0 && (
                <View style={styles.previewRow}>
                  <Text style={{ color: '#888', fontSize: 13 }}>Score preview: </Text>
                  <TrustBadge score={previewScore} size="sm" />
                </View>
              )}
              {!!formError && <Text style={styles.formError}>{formError}</Text>}
              <Pressable
                style={[styles.submitBtn, (!challengeBody.trim() || submitting) && styles.submitDisabled]}
                onPress={submitChallenge}
                disabled={!challengeBody.trim() || submitting}
              >
                <Text style={styles.submitText}>{submitting ? 'Posting…' : 'Drop the Challenge'}</Text>
              </Pressable>
            </View>
          )}

          {/* ── CHALLENGES ── */}
          {challenges.length > 0 && (
            <>
              <Text style={styles.challengesTitle}>⚔️ Challenges ({challenges.length})</Text>
              {challenges.map((c) => (
                <View key={c.id} style={styles.challengeCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.username}>@{c.profiles?.username}</Text>
                    <TrustBadge score={c.trust_score} size="sm" />
                  </View>
                  <Text style={styles.challengeBody}>{c.body}</Text>
                  {c.challenge_sources && c.challenge_sources.length > 0 && (
                    <View style={styles.sourcesBox}>
                      <Text style={styles.sourcesTitle}>📎 Their Receipts</Text>
                      {c.challenge_sources.map((s) => (
                        <View key={s.id} style={styles.sourceItem}>
                          <View style={[styles.tierDot, { backgroundColor: tierColor(s.trust_tier) }]} />
                          <Text style={styles.sourceDomain}>{s.domain}</Text>
                          <Text style={[styles.sourceTier, { color: tierColor(s.trust_tier) }]}>
                            {s.trust_tier} · {s.score}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <View style={styles.vsBar}>
                    <View style={[styles.vsSegment, { backgroundColor: trustColor(take.trust_score), flex: take.trust_score || 1 }]} />
                    <Text style={styles.vsLabel}>vs</Text>
                    <View style={[styles.vsSegment, { backgroundColor: trustColor(c.trust_score), flex: c.trust_score || 1 }]} />
                  </View>
                  <View style={styles.vsScores}>
                    <Text style={{ color: trustColor(take.trust_score), fontSize: 12 }}>
                      Original: {Math.round(take.trust_score)}
                    </Text>
                    <Text style={{ color: trustColor(c.trust_score), fontSize: 12 }}>
                      Challenge: {Math.round(c.trust_score)}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 14, gap: 12, paddingBottom: 40 },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: 40 },
  takeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  username: { color: '#a0c4ff', fontWeight: '600' },
  catPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  polCat: { backgroundColor: '#1e3a5f' },
  spoCat: { backgroundColor: '#1a3a1a' },
  catText: { color: '#aaa', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  takeBody: { color: '#e8e8e8', fontSize: 16, lineHeight: 24 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { color: '#888', fontSize: 12 },
  sourcesBox: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#222',
  },
  sourcesTitle: { color: '#888', fontSize: 13, fontWeight: '600' },
  sourceItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tierDot: { width: 7, height: 7, borderRadius: 4 },
  sourceDomain: { flex: 1, color: '#bbb', fontSize: 12 },
  sourceTier: { fontSize: 12, fontWeight: '600' },
  removeBtn: { color: '#555' },
  stats: { flexDirection: 'row', gap: 16 },
  stat: { color: '#888', fontSize: 13 },
  challengeBtn: {
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  challengeBtnText: { color: '#f59e0b', fontWeight: '700', fontSize: 15 },
  alreadyChallenged: { color: '#555', textAlign: 'center', fontSize: 13 },
  challengeForm: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#f59e0b44',
  },
  formTitle: { color: '#f59e0b', fontWeight: '700', fontSize: 15 },
  challengeInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 15,
    lineHeight: 22,
  },
  label: { color: '#888', fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  smallInput: {
    backgroundColor: '#111',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    fontSize: 13,
  },
  addBtn: { backgroundColor: '#1f6feb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  previewRow: { flexDirection: 'row', alignItems: 'center' },
  formError: { color: '#ef4444', fontSize: 13 },
  submitBtn: {
    backgroundColor: '#f59e0b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#000', fontWeight: '700', fontSize: 15 },
  challengesTitle: { color: '#f59e0b', fontWeight: '700', fontSize: 16, marginTop: 4 },
  challengeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#f59e0b33',
  },
  challengeBody: { color: '#e8e8e8', fontSize: 15, lineHeight: 22 },
  vsBar: {
    height: 6,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  vsSegment: { height: 6, borderRadius: 3 },
  vsLabel: { color: '#555', fontSize: 11, fontWeight: '700' },
  vsScores: { flexDirection: 'row', justifyContent: 'space-between' },
});
