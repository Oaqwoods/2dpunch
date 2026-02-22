import React, { useCallback, useEffect, useState } from 'react';
import {
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
import { useNavigation } from '@react-navigation/native';
import { createSupabaseClient } from '../lib/supabase';
import { extractDomain, scoreDomain, calcAverageTrust, tierColor } from '../lib/trustScore';
import { fetchUrlTitle } from '../lib/urlMetadata';
import TrustBadge from '../components/TrustBadge';
import Toast from '../components/Toast';
import type { Category } from '../types';

const supabase = createSupabaseClient();

interface PendingSource {
  url: string;
  domain: string;
  tier: string;
  score: number;
  title: string;
  fetching: boolean;
}

export default function CreateTakeScreen() {
  const nav = useNavigation();
  const [category, setCategory] = useState<Category>('politics');
  const [body, setBody] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sources, setSources] = useState<PendingSource[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' });

  const previewScore = calcAverageTrust(sources.map((s) => s.score));

  const resolveAndAddSource = useCallback((rawUrl: string) => {
    let url = rawUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (sources.length >= 5) { setError('Max 5 receipts'); return; }
    try { new URL(url); } catch { setError('Enter a valid URL'); return; }
    const domain = extractDomain(url);
    const { tier, score } = scoreDomain(domain);
    const pending: PendingSource = { url, domain, tier, score, title: '', fetching: true };
    setSources((prev) => [...prev, pending]);
    setSourceUrl('');
    setError('');
    fetchUrlTitle(url).then((title) =>
      setSources((prev) =>
        prev.map((s) => (s.url === url ? { ...s, title, fetching: false } : s))
      )
    );
  }, [sources.length]);

  // Auto-add when a full URL is pasted
  useEffect(() => {
    if (
      (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) &&
      sourceUrl.length > 12 &&
      !sourceUrl.includes(' ')
    ) {
      const timer = setTimeout(() => {
        resolveAndAddSource(sourceUrl);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [sourceUrl, resolveAndAddSource]);

  function addSource() {
    resolveAndAddSource(sourceUrl);
  }

  function removeSource(idx: number) {
    setSources((prev) => prev.filter((_, i) => i !== idx));
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '');
    if (!t || tags.includes(t) || tags.length >= 5) return;
    setTags((prev) => [...prev, t]);
    setTagInput('');
  }

  // Live trust meter width (0-100%)
  const trustPct = Math.min(previewScore, 100);
  const trustMeterColor = trustPct >= 70 ? '#22c55e' : trustPct >= 40 ? '#f59e0b' : trustPct > 0 ? '#ef4444' : '#2a2a2a';

  async function submit() {
    setError('');
    if (!body.trim()) { setError('Write your take first'); return; }
    if (body.trim().length > 500) { setError('Take must be 500 chars or less'); return; }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // Insert take
      const { data: take, error: takeErr } = await supabase
        .from('takes')
        .insert({
          user_id: user.id,
          category,
          body: body.trim(),
          tags,
          trust_score: previewScore,
        })
        .select()
        .single();

      if (takeErr) throw takeErr;

      // Insert sources
      if (sources.length > 0) {
        const { error: srcErr } = await supabase.from('sources').insert(
          sources.map((s) => ({
            take_id: take.id,
            url: s.url,
            domain: s.domain,
            trust_tier: s.tier,
            score: s.score,
          }))
        );
        if (srcErr) throw srcErr;

        // Refresh trust score on take
        await supabase.rpc('refresh_take_trust_score', { p_take_id: take.id });
      }

      setToast({ visible: true, message: 'Take posted! 🔥' });
      setTimeout(() => nav.goBack(), 1200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to post take';
      // Rate limit handling
      if (msg.includes('row-level') || msg.includes('policy')) {
        setError('You\'ve posted too many takes this hour. Try again later.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.row}>
            {(['politics', 'sports'] as Category[]).map((c) => (
              <Pressable
                key={c}
                style={[styles.categoryBtn, category === c && styles.categoryActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[
                  styles.categoryText,
                  category === c && styles.categoryTextActive,
                  category === c && c === 'politics' && styles.categoryPoliticsActive,
                  category === c && c === 'sports' && styles.categorySportsActive,
                ]}>
                  {c === 'politics' ? '🏛 Politics' : '🏆 Sports'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Body */}
          <Text style={styles.label}>Your Take <Text style={styles.charCount}>{body.length}/500</Text></Text>
          <TextInput
            style={styles.bodyInput}
            placeholder="State your take clearly and confidently..."
            placeholderTextColor="#444"
            multiline
            value={body}
            onChangeText={setBody}
            maxLength={500}
          />

          {/* Tags */}
          <Text style={styles.label}>Tags (optional)</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="#NBA, #Immigration..."
              placeholderTextColor="#444"
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              returnKeyType="done"
            />
            <Pressable style={styles.addBtn} onPress={addTag}>
              <Text style={styles.addBtnText}>Add</Text>
            </Pressable>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagList}>
              {tags.map((t) => (
                <Pressable key={t} onPress={() => setTags((p) => p.filter((x) => x !== t))}>
                  <Text style={styles.tagChip}>#{t} ✕</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Receipts / Sources */}
          <View style={styles.receiptsHeader}>
            <Text style={styles.label}>
              📎 Receipts{' '}
              <Text style={styles.subLabel}>({sources.length}/5 — auto-scored by domain)</Text>
            </Text>
          </View>

          {/* Trust meter */}
          <View style={styles.trustMeterRow}>
            <View style={styles.trustMeterTrack}>
              <View style={[styles.trustMeterFill, { width: `${trustPct}%`, backgroundColor: trustMeterColor }]} />
            </View>
            {sources.length > 0
              ? <TrustBadge score={previewScore} size="sm" />
              : <Text style={styles.trustMeterLabel}>Add receipts to boost trust</Text>
            }
          </View>

          {/* Receipt cards */}
          {sources.map((s, i) => (
            <View key={i} style={styles.sourceRow}>
              <View style={[styles.tierDot, { backgroundColor: tierColor(s.tier as 'high' | 'mid' | 'low') }]} />
              <View style={{ flex: 1 }}>
                {s.fetching
                  ? <Text style={styles.sourceFetching}>🔍 Fetching headline…</Text>
                  : s.title
                    ? <Text style={styles.sourceTitle} numberOfLines={1}>{s.title}</Text>
                    : null
                }
                <Text style={[styles.sourceDomain, { color: tierColor(s.tier as 'high' | 'mid' | 'low') }]}>
                  {s.domain} · {s.score}pts
                </Text>
              </View>
              <Pressable onPress={() => removeSource(i)} hitSlop={8}>
                <Text style={styles.removeBtn}>✕</Text>
              </Pressable>
            </View>
          ))}

          {/* URL input — paste detects automatically */}
          {sources.length < 5 && (
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder={sources.length === 0 ? '🔗 Paste a URL — headline auto-fills…' : 'Add another receipt…'}
                placeholderTextColor="#444"
                value={sourceUrl}
                onChangeText={setSourceUrl}
                autoCapitalize="none"
                keyboardType="url"
                onSubmitEditing={addSource}
                returnKeyType="done"
              />
              <Pressable style={styles.addBtn} onPress={addSource}>
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.submitBtn, (submitting || !body.trim()) && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={submitting || !body.trim()}
          >
            <Text style={styles.submitText}>{submitting ? 'Posting…' : 'Drop the Take'}</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast({ visible: false, message: '' })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  label: { color: '#ccc', fontWeight: '700', fontSize: 14, marginTop: 8 },
  subLabel: { color: '#555', fontWeight: '400' },
  charCount: { color: '#555', fontWeight: '400' },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    fontSize: 14,
  },
  bodyInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 24,
  },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  categoryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  categoryActive: { borderColor: '#1f6feb', backgroundColor: '#0d2a4a' },
  categoryText: { color: '#555', fontWeight: '700' },
  categoryTextActive: { color: '#fff' },
  categoryPoliticsActive: { color: '#e63946' },
  categorySportsActive: { color: '#2ec4b6' },
  addBtn: {
    backgroundColor: '#1f6feb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '600' },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    color: '#888',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#333',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 10,
  },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  receiptsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  trustMeterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  trustMeterTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#1a1a1a',
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  trustMeterFill: { height: 6, borderRadius: 3, minWidth: 4 },
  trustMeterLabel: { color: '#444', fontSize: 12 },
  sourceFetching: { color: '#555', fontSize: 12, fontStyle: 'italic' },
  sourceTitle: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  sourceDomain: { fontSize: 12, marginTop: 1 },
  removeBtn: { color: '#555', fontSize: 14 },
  trustPreviewLabel: { color: '#888', fontSize: 13 },
  error: { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  submitBtn: {
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
