import { useEffect, useMemo, useState } from 'react';
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
  View
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { createSupabaseClient } from './src/lib/supabase';

type Post = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  user_id: string;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(false);
  const [email, setEmail] = useState('demo@pathstream.app');
  const [password, setPassword] = useState('password123');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [message, setMessage] = useState('');

  const configError = useMemo(
    () =>
      !process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
        ? 'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY before starting Expo.'
        : '',
    []
  );
  const supabase = useMemo(() => (configError ? null : createSupabaseClient()), [configError]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session?.user) {
      setPosts([]);
      return;
    }

    void loadPosts();
  }, [session?.user?.id]);

  async function loadPosts() {
    if (!supabase) return;

    setFeedLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      setMessage(error.message);
    } else {
      setPosts((data as Post[]) ?? []);
      setMessage('');
    }
    setFeedLoading(false);
  }

  async function signIn() {
    if (!supabase) return;

    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
  }

  async function signUp() {
    if (!supabase) return;

    setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage('Check your email if confirmation is enabled, then sign in.');
  }

  async function signOut() {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) setMessage(error.message);
  }

  async function createPost() {
    if (!supabase || !session?.user || !title.trim() || !body.trim()) return;

    const { error } = await supabase.from('posts').insert({
      user_id: session.user.id,
      title: title.trim(),
      body: body.trim()
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setTitle('');
    setBody('');
    await loadPosts();
  }

  if (configError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Text style={styles.errorTitle}>Supabase Config Required</Text>
        <Text style={styles.errorBody}>{configError}</Text>
      </SafeAreaView>
    );
  }

  if (authLoading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar style="dark" />
        <View style={styles.authCard}>
          <Text style={styles.heading}>2dpunch</Text>
          <Text style={styles.subheading}>Expo + Supabase starter</Text>

          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            secureTextEntry
            placeholder="Password"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.authButtons}>
            <Pressable style={styles.primaryButton} onPress={signIn}>
              <Text style={styles.primaryButtonText}>Sign In</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={signUp}>
              <Text style={styles.secondaryButtonText}>Sign Up</Text>
            </Pressable>
          </View>
          {!!message && <Text style={styles.message}>{message}</Text>}
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.feedHeader}>
        <View>
          <Text style={styles.heading}>2dpunch Feed</Text>
          <Text style={styles.subheading}>{session.user.email}</Text>
        </View>
        <Pressable style={styles.secondaryButton} onPress={signOut}>
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
        </Pressable>
      </View>

      <View style={styles.createBox}>
        <TextInput
          placeholder="Post title"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          placeholder="Write something"
          style={[styles.input, styles.multilineInput]}
          value={body}
          onChangeText={setBody}
          multiline
        />
        <Pressable style={styles.primaryButton} onPress={createPost}>
          <Text style={styles.primaryButtonText}>Create Post</Text>
        </Pressable>
      </View>

      {!!message && <Text style={styles.message}>{message}</Text>}
      {feedLoading ? (
        <ActivityIndicator style={styles.feedLoader} size="large" />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No posts yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <Text style={styles.postTitle}>{item.title}</Text>
              <Text style={styles.postBody}>{item.body}</Text>
              <Text style={styles.postTime}>{formatTime(item.created_at)}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
    paddingHorizontal: 16,
    paddingTop: 16
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  authCard: {
    marginTop: 80,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 10
  },
  heading: {
    fontSize: 24,
    fontWeight: '700'
  },
  subheading: {
    color: '#5f6c80',
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#d8deea',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff'
  },
  multilineInput: {
    minHeight: 84,
    textAlignVertical: 'top'
  },
  authButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  primaryButton: {
    backgroundColor: '#1f6feb',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#c4d1eb',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#233248',
    fontWeight: '600'
  },
  message: {
    marginTop: 8,
    color: '#243952'
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  createBox: {
    gap: 8,
    marginBottom: 8
  },
  feedLoader: {
    marginTop: 20
  },
  listContent: {
    paddingVertical: 10,
    gap: 10,
    paddingBottom: 80
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    gap: 6
  },
  postTitle: {
    fontWeight: '700',
    fontSize: 16
  },
  postBody: {
    color: '#243952'
  },
  postTime: {
    fontSize: 12,
    color: '#607188'
  },
  emptyText: {
    marginTop: 20,
    textAlign: 'center',
    color: '#607188'
  },
  errorTitle: {
    marginTop: 60,
    fontSize: 20,
    fontWeight: '700'
  },
  errorBody: {
    marginTop: 10,
    color: '#243952'
  }
});
