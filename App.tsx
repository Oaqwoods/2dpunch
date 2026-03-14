import 'react-native-url-polyfill/auto';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { createSupabaseClient } from './src/lib/supabase';
import AppNavigator from './src/navigation/AppNavigator';

const supabase = createSupabaseClient();

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [authMode, setAuthMode] = useState<'landing' | 'signin' | 'signup'>('landing');
  const [submitting, setSubmitting] = useState(false);

  const configError = useMemo(
    () =>
      !process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
        ? 'Missing Supabase env vars.'
        : '',
    []
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleAuth() {
    setMessage('');
    setSubmitting(true);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) throw error;
        setMessage('Account created! You can now sign in.');
        setAuthMode('signin');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (configError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.errorTitle}>Config Error</Text>
        <Text style={styles.errorBody}>{configError}</Text>
      </SafeAreaView>
    );
  }

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <ActivityIndicator color="#fff" />
      </SafeAreaView>
    );
  }

  if (!session) {
    // Show landing hero until user taps "Get Started" / "Sign In"
    if (!authMode || authMode === 'landing') {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" />
          <View style={styles.heroWrap}>
            <Text style={styles.logo}>2dpunch</Text>
            <Text style={styles.tagline}>Debate with receipts.</Text>

            <View style={styles.features}>
              <FeatureRow icon="🎯" text="Post hot takes on politics & sports" />
              <FeatureRow icon="📎" text="Back every claim with a source URL" />
              <FeatureRow icon="🔬" text="Sources are scored for credibility — automatically" />
              <FeatureRow icon="⚔️" text="Challenge takes you disagree with, with your own receipts" />
              <FeatureRow icon="🔥" text="The most trusted, most debated takes rise to the top" />
            </View>

            <Pressable
              style={[styles.primaryBtn, { marginTop: 32 }]}
              onPress={() => setAuthMode('signup')}
            >
              <Text style={styles.primaryBtnText}>Get Started — It's Free</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={() => setAuthMode('signin')}
            >
              <Text style={styles.secondaryBtnText}>Sign In</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar style="light" />
        <View style={styles.authWrap}>
          <Pressable onPress={() => setAuthMode('landing')} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.logo}>2dpunch</Text>
          <Text style={styles.tagline}>
            {authMode === 'signup' ? 'Create your account' : 'Welcome back'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#444"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#444"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable
            style={[styles.primaryBtn, submitting && styles.btnDisabled]}
            onPress={handleAuth}
            disabled={submitting}
          >
            <Text style={styles.primaryBtnText}>
              {submitting ? '…' : authMode === 'signup' ? 'Create Account' : 'Sign In'}
            </Text>
          </Pressable>

          <Pressable onPress={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setMessage(''); }}>
            <Text style={styles.switchText}>
              {authMode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </Text>
          </Pressable>

          {!!message && (
            <Text style={[styles.message, message.includes('created') && styles.successMessage]}>
              {message}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <AppNavigator userId={session.user.id} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authWrap: {
    width: '100%',
    maxWidth: 380,
    paddingHorizontal: 24,
    gap: 12,
  },
  logo: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    textAlign: 'center',
    marginBottom: 4,
  },
  tagline: {
    color: '#555',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: '#1f6feb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  switchText: { color: '#555', textAlign: 'center', fontSize: 14 },
  message: { color: '#ef4444', textAlign: 'center', fontSize: 14 },
  successMessage: { color: '#22c55e' },
  errorTitle: { color: '#ef4444', fontSize: 20, fontWeight: '700', marginBottom: 10 },
  errorBody: { color: '#888', paddingHorizontal: 24, textAlign: 'center' },
  // Landing
  heroWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  features: { width: '100%', marginTop: 28, gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureIcon: { fontSize: 18, marginTop: 1 },
  featureText: { color: '#ccc', fontSize: 14, flex: 1, lineHeight: 20 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  secondaryBtnText: { color: '#888', fontWeight: '600', fontSize: 15 },
  backBtn: { marginBottom: 8 },
  backText: { color: '#555', fontSize: 15 },
});
