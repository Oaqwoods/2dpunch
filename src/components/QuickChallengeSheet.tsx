import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createSupabaseClient } from '../lib/supabase';
import { extractDomain, scoreDomain, calcAverageTrust, tierColor } from '../lib/trustScore';
import { fetchUrlTitle } from '../lib/urlMetadata';
import TrustBadge from './TrustBadge';
import Toast from './Toast';
import type { Take } from '../types';

const supabase = createSupabaseClient();

interface PendingSource {
  url: string;
  domain: string;
  tier: string;
  score: number;
  title: string;
  fetching: boolean;
}

interface Props {
  take: Take | null; // null = hidden
  myId: string | null;
  onClose: () => void;
  onPosted: () => void;
}

export default function QuickChallengeSheet({ take, myId, onClose, onPosted }: Props) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const [body, setBody] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [source, setSource] = useState<PendingSource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  const isVisible = take !== null;

  useEffect(() => {
    if (isVisible) {
      setBody('');
      setUrlInput('');
      setSource(null);
      setError('');
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 9,
        tension: 70,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible, slideAnim]);

  const resolveAndAddSource = useCallback((rawUrl: string) => {
    let url = rawUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try { new URL(url); } catch { setError('Enter a valid URL'); return; }
    const domain = extractDomain(url);
    const { tier, score } = scoreDomain(domain);
    setSource({ url, domain, tier, score, title: '', fetching: true });
    setUrlInput('');
    setError('');
    fetchUrlTitle(url).then((title) =>
      setSource((s) => (s ? { ...s, title, fetching: false } : s))
    );
  }, []);

  // Auto-add when a full URL is pasted into the field
  const handleUrlChange = useCallback(
    (text: string) => {
      setUrlInput(text);
      if (
        (text.startsWith('http://') || text.startsWith('https://')) &&
        text.length > 12 &&
        !text.includes(' ')
      ) {
        setTimeout(() => {
          setUrlInput((cur) => {
            if (cur === text) {
              resolveAndAddSource(text);
              return '';
            }
            return cur;
          });
        }, 600);
      }
    },
    [resolveAndAddSource]
  );

  async function submit() {
    if (!take || !myId) return;
    setError('');
    if (!body.trim()) { setError('Write your challenge'); return; }
    if (body.length > 500) { setError('Max 500 chars'); return; }
    setSubmitting(true);
    try {
      const previewScore = source ? calcAverageTrust([source.score]) : 0;
      const { data: challenge, error: cErr } = await supabase
        .from('challenges')
        .insert({ take_id: take.id, user_id: myId, body: body.trim(), trust_score: previewScore })
        .select()
        .single();
      if (cErr) throw cErr;

      if (source) {
        await supabase.from('challenge_sources').insert({
          challenge_id: challenge.id,
          url: source.url,
          domain: source.domain,
          trust_tier: source.tier,
          score: source.score,
        });
        await supabase.rpc('refresh_challenge_trust_score', { p_challenge_id: challenge.id });
      }

      setToast({ visible: true, message: 'Challenge dropped! ⚔️' });
      setTimeout(() => {
        onPosted();
        onClose();
      }, 1200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed';
      if (msg.includes('unique') || msg.includes('duplicate')) {
        setError('You already challenged this take');
      } else if (msg.includes('policy') || msg.includes('row-level')) {
        setError("Can't challenge your own take or rate limit reached");
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const trustScore = source ? calcAverageTrust([source.score]) : 0;

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Tap-outside overlay */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'position' : undefined}
          style={styles.kav}
          pointerEvents="box-none"
        >
          <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
            {/* Drag handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                ⚔️ Challenge{take?.profiles?.username ? ` @${take.profiles.username}` : ''}
              </Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Text style={styles.closeBtn}>✕</Text>
              </Pressable>
            </View>

            {/* Take preview */}
            {take && (
              <View style={styles.takePreview}>
                <Text style={styles.takePreviewText} numberOfLines={2}>
                  "{take.body}"
                </Text>
              </View>
            )}

            {/* Challenge body */}
            <TextInput
              style={styles.bodyInput}
              placeholder="Make your counter-argument with receipts..."
              placeholderTextColor="#444"
              multiline
              value={body}
              onChangeText={setBody}
              maxLength={500}
              autoFocus
            />
            <Text style={styles.charCount}>{body.length}/500</Text>

            {/* Receipt */}
            {source ? (
              <View style={styles.sourceCard}>
                {source.fetching ? (
                  <Text style={styles.sourceFetching}>🔍 Fetching headline…</Text>
                ) : (
                  <>
                    <View
                      style={[
                        styles.tierDot,
                        { backgroundColor: tierColor(source.tier as 'high' | 'mid' | 'low') },
                      ]}
                    />
                    <View style={{ flex: 1 }}>
                      {!!source.title && (
                        <Text style={styles.sourceTitle} numberOfLines={1}>
                          {source.title}
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.sourceMeta,
                          { color: tierColor(source.tier as 'high' | 'mid' | 'low') },
                        ]}
                      >
                        {source.domain} · {source.score}pts
                      </Text>
                    </View>
                    <Pressable onPress={() => setSource(null)} hitSlop={8}>
                      <Text style={styles.removeBtn}>✕</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.urlRow}>
                <TextInput
                  style={styles.urlInput}
                  placeholder="📎 Paste a receipt URL to boost trust score..."
                  placeholderTextColor="#444"
                  value={urlInput}
                  onChangeText={handleUrlChange}
                  autoCapitalize="none"
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={() => resolveAndAddSource(urlInput)}
                />
              </View>
            )}

            {!!error && <Text style={styles.error}>{error}</Text>}

            {/* Footer */}
            <View style={styles.footer}>
              {trustScore > 0 && <TrustBadge score={trustScore} size="sm" />}
              <Pressable
                style={[
                  styles.submitBtn,
                  (!body.trim() || submitting) && styles.submitDisabled,
                ]}
                onPress={submit}
                disabled={!body.trim() || submitting}
              >
                <Text style={styles.submitText}>
                  {submitting ? 'Posting…' : 'Drop the Challenge ⚔️'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast({ visible: false, message: '' })}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000088',
  },
  kav: {
    width: '100%',
  },
  sheet: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sheetTitle: { color: '#f59e0b', fontWeight: '700', fontSize: 16 },
  closeBtn: { color: '#555', fontSize: 18 },
  takePreview: {
    backgroundColor: '#0f0f0f',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#333',
  },
  takePreviewText: { color: '#666', fontSize: 13, fontStyle: 'italic', lineHeight: 18 },
  bodyInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 15,
    lineHeight: 22,
  },
  charCount: { color: '#444', fontSize: 12, textAlign: 'right', marginTop: -4 },
  urlRow: {},
  urlInput: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    fontSize: 13,
  },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  tierDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  sourceTitle: { color: '#ddd', fontSize: 13, fontWeight: '600' },
  sourceMeta: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  sourceFetching: { color: '#555', fontSize: 13, fontStyle: 'italic' },
  removeBtn: { color: '#444', fontSize: 14 },
  error: { color: '#ef4444', fontSize: 13 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  submitBtn: {
    flex: 1,
    backgroundColor: '#f59e0b',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.35 },
  submitText: { color: '#000', fontWeight: '800', fontSize: 15 },
});
