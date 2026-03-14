import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createSupabaseClient } from '../lib/supabase';
import type { RootStackParamList } from '../types';

const supabase = createSupabaseClient();
const APP_VERSION = '1.0.0';
const CONTACT_EMAIL = 'info@oaqwoods.app';

export default function SettingsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [signingOut, setSigningOut] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          setSigningOut(false);
        },
      },
    ]);
  }

  async function copyEmail() {
    await Clipboard.setStringAsync(CONTACT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openEmail() {
    void Linking.openURL(
      `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('[2dpunch] Feedback')}`
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Account ─────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => nav.navigate('SuggestSource')}
          >
            <Text style={styles.rowLabel}>💡 Suggest a Source</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={({ pressed }) => [styles.row, styles.rowDestructive, pressed && styles.pressed]}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            <Text style={styles.rowLabelDestructive}>
              {signingOut ? 'Signing out…' : '↩ Sign Out'}
            </Text>
          </Pressable>
        </View>

        {/* ── Posting limits ───────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Posting Limits</Text>
        <View style={styles.card}>
          <InfoRow icon="🎯" label="Takes" value="10 per hour" />
          <View style={styles.divider} />
          <InfoRow icon="⚔️" label="Challenges" value="20 per hour" />
          <View style={styles.divider} />
          <InfoRow icon="📎" label="Receipts per take" value="5 max" />
        </View>

        {/* ── Contact ──────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>Contact Us</Text>
        <View style={styles.card}>
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={openEmail}
          >
            <View style={styles.emailBlock}>
              <Text style={styles.rowLabel}>✉️ Email us</Text>
              <Text style={styles.emailAddress}>{CONTACT_EMAIL}</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.copyBtn, pressed && styles.pressed]}
              onPress={copyEmail}
              hitSlop={12}
            >
              <Text style={styles.copyBtnText}>{copied ? '✓ Copied' : 'Copy'}</Text>
            </Pressable>
          </Pressable>
        </View>

        {/* ── About ────────────────────────────────────────────────── */}
        <Text style={styles.sectionHeader}>About</Text>
        <View style={styles.card}>
          <InfoRow icon="📱" label="Version" value={APP_VERSION} />
        </View>

        <Text style={styles.footer}>
          2dpunch — Debate with receipts.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{icon} {label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    color: '#666',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  divider: { height: 1, backgroundColor: '#222', marginLeft: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  rowDestructive: {},
  pressed: { opacity: 0.6 },
  rowLabel: { color: '#e5e5e5', fontSize: 15 },
  rowLabelDestructive: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
  rowValue: { color: '#666', fontSize: 13 },
  chevron: { color: '#444', fontSize: 18, fontWeight: '300' },
  emailBlock: { gap: 2 },
  emailAddress: { color: '#666', fontSize: 12 },
  copyBtn: {
    backgroundColor: '#1f6feb22',
    borderWidth: 1,
    borderColor: '#1f6feb55',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  copyBtnText: { color: '#1f6feb', fontSize: 12, fontWeight: '700' },
  footer: {
    color: '#333',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 18,
  },
});
