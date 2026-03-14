import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { createSupabaseClient } from '../lib/supabase';
import { extractDomain } from '../lib/trustScore';
import { parseSupabaseError } from '../lib/errorUtils';
import Toast from '../components/Toast';
import type { SourceSuggestion } from '../types';

const supabase = createSupabaseClient();

export default function SuggestSourceScreen() {
  const [domain, setDomain] = useState('');
  const [urlExample, setUrlExample] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [suggestions, setSuggestions] = useState<SourceSuggestion[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  const loadSuggestions = useCallback(async () => {
    setLoadingList(true);
    const [{ data: sug }, { data: votes }] = await Promise.all([
      supabase
        .from('source_suggestions')
        .select('*')
        .order('votes', { ascending: false })
        .limit(50),
      myId
        ? supabase
            .from('suggestion_votes')
            .select('suggestion_id')
            .eq('user_id', myId)
        : Promise.resolve({ data: [] }),
    ]);
    setSuggestions(sug ?? []);
    setMyVotes(new Set((votes ?? []).map((v: { suggestion_id: string }) => v.suggestion_id)));
    setLoadingList(false);
  }, [myId]);

  useFocusEffect(useCallback(() => { void loadSuggestions(); }, [loadSuggestions]));

  function parseDomainInput(raw: string): string {
    const trimmed = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    return trimmed;
  }

  async function submit() {
    setError('');
    const cleanDomain = parseDomainInput(domain);
    if (!cleanDomain || !cleanDomain.includes('.')) {
      setError('Enter a valid domain (e.g. bbc.com)');
      return;
    }
    if (reason.trim().length < 10) {
      setError('Please explain why this source should be added (min 10 chars)');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { error: err } = await supabase.from('source_suggestions').insert({
        user_id: user.id,
        domain: cleanDomain,
        url_example: urlExample.trim() || null,
        reason: reason.trim(),
      });

      if (err) throw new Error(err.message);

      setDomain('');
      setUrlExample('');
      setReason('');
      setToast({ visible: true, message: '✅ Suggestion submitted! Thanks.' });
      void loadSuggestions();
    } catch (e) {
      const msg = parseSupabaseError(e);
      // "already done that" means the domain already exists
      setError(
        msg.includes("already done that")
          ? `${cleanDomain} has already been suggested.`
          : msg
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleVote(suggestion: SourceSuggestion) {
    if (!myId) return;
    const voted = myVotes.has(suggestion.id);

    // Optimistic update
    setMyVotes((prev) => {
      const next = new Set(prev);
      voted ? next.delete(suggestion.id) : next.add(suggestion.id);
      return next;
    });
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === suggestion.id ? { ...s, votes: s.votes + (voted ? -1 : 1) } : s
      )
    );

    if (voted) {
      await supabase
        .from('suggestion_votes')
        .delete()
        .eq('user_id', myId)
        .eq('suggestion_id', suggestion.id);
    } else {
      await supabase.from('suggestion_votes').insert({ user_id: myId, suggestion_id: suggestion.id });
    }
  }

  const statusColor = (s: string) =>
    s === 'approved' ? '#22c55e' : s === 'rejected' ? '#ef4444' : '#f59e0b';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={suggestions}
          keyExtractor={(s) => s.id}
          ListHeaderComponent={
            <View style={styles.formBlock}>
              <Text style={styles.heading}>Suggest a Source</Text>
              <Text style={styles.subheading}>
                Know a credible site that's scoring wrong? Submit it for review.
                Community votes help prioritise additions.
              </Text>

              <Text style={styles.label}>Domain *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. propublica.org"
                placeholderTextColor="#444"
                value={domain}
                onChangeText={(t) => { setDomain(t); setError(''); }}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Text style={styles.label}>Example URL (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://propublica.org/article/..."
                placeholderTextColor="#444"
                value={urlExample}
                onChangeText={setUrlExample}
                autoCapitalize="none"
                keyboardType="url"
              />

              <Text style={styles.label}>Why should it be added / re-rated? *</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Describe the site's editorial standards, ownership, fact-checking process…"
                placeholderTextColor="#444"
                value={reason}
                onChangeText={(t) => { setReason(t); setError(''); }}
                multiline
                numberOfLines={3}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.7 }]}
                onPress={submit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitText}>Submit Suggestion</Text>
                }
              </Pressable>

              <Text style={styles.sectionTitle}>Community Suggestions</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.domainRow}>
                    <Text style={styles.domainText}>{item.domain}</Text>
                    <View style={[styles.statusBadge, { borderColor: statusColor(item.status) }]}>
                      <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.reasonText} numberOfLines={2}>{item.reason}</Text>
                </View>
                <Pressable
                  style={[styles.voteBtn, myVotes.has(item.id) && styles.votedBtn]}
                  onPress={() => void toggleVote(item)}
                  disabled={!myId}
                >
                  <Text style={styles.voteIcon}>▲</Text>
                  <Text style={styles.voteCount}>{item.votes}</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            loadingList
              ? <ActivityIndicator color="#555" style={{ marginTop: 24 }} />
              : <Text style={styles.empty}>No suggestions yet — be the first!</Text>
          }
          contentContainerStyle={styles.list}
        />
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
  formBlock: { padding: 16 },
  heading: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  subheading: { color: '#666', fontSize: 13, lineHeight: 18, marginBottom: 20 },
  label: { color: '#aaa', fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#161616',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#fff',
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
  },
  textarea: { height: 80, textAlignVertical: 'top' },
  errorText: { color: '#ef4444', fontSize: 13, marginBottom: 10 },
  submitBtn: {
    backgroundColor: '#1f6feb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 28,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { color: '#666', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  list: { paddingBottom: 40 },
  card: { marginHorizontal: 12, marginBottom: 10, backgroundColor: '#161616', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#222' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  domainRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  domainText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  statusBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  reasonText: { color: '#888', fontSize: 12, lineHeight: 16 },
  voteBtn: { alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: '#1a1a2e', minWidth: 48 },
  votedBtn: { backgroundColor: '#1f3a5f' },
  voteIcon: { color: '#1f6feb', fontWeight: '700', fontSize: 12 },
  voteCount: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { color: '#555', textAlign: 'center', marginTop: 24 },
});
