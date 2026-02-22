import React, { useCallback, useEffect, useState } from 'react';
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

interface Props {
  userId: string;
  isSelf?: boolean;
}

export default function ProfileScreen({ userId, isSelf = false }: Props) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [saveError, setSaveError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [profileRes, takesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('takes')
        .select('*, profiles(id, username), sources(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    if (profileRes.data) {
      setProfile(profileRes.data);
      setUsername(profileRes.data.username);
      setBio(profileRes.data.bio);
    }
    setTakes(takesRes.data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  async function saveProfile() {
    setSaveError('');
    if (username.trim().length < 2) { setSaveError('Username too short'); return; }
    const { error } = await supabase
      .from('profiles')
      .update({ username: username.trim(), bio: bio.trim() })
      .eq('id', userId);
    if (error) {
      setSaveError(error.message.includes('unique') ? 'Username taken' : error.message);
    } else {
      setEditing(false);
      await load();
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#fff" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={takes}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={() => (
          <View style={styles.profileHeader}>
            {/* Avatar placeholder */}
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.username?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>

            {editing ? (
              <View style={styles.editForm}>
                <TextInput
                  style={styles.editInput}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username"
                  placeholderTextColor="#444"
                  autoCapitalize="none"
                  maxLength={30}
                />
                <TextInput
                  style={styles.editInput}
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Bio..."
                  placeholderTextColor="#444"
                  maxLength={200}
                  multiline
                />
                {!!saveError && <Text style={styles.saveError}>{saveError}</Text>}
                <View style={styles.editButtons}>
                  <Pressable style={styles.saveBtn} onPress={saveProfile}>
                    <Text style={styles.saveBtnText}>Save</Text>
                  </Pressable>
                  <Pressable style={styles.cancelBtn} onPress={() => setEditing(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.profileName}>@{profile?.username}</Text>
                {!!profile?.bio && <Text style={styles.profileBio}>{profile.bio}</Text>}
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNum}>{profile?.takes_count ?? takes.length}</Text>
                    <Text style={styles.statLabel}>Takes</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <TrustBadge score={profile?.avg_trust_score ?? 0} size="sm" />
                    <Text style={styles.statLabel}>Avg Trust</Text>
                  </View>
                </View>
                {isSelf && (
                  <View style={styles.selfActions}>
                    <Pressable style={styles.editBtn} onPress={() => setEditing(true)}>
                      <Text style={styles.editBtnText}>Edit Profile</Text>
                    </Pressable>
                    <Pressable style={styles.signOutBtn} onPress={signOut}>
                      <Text style={styles.signOutText}>Sign Out</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
            <Text style={styles.takesHeader}>Takes</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No takes yet</Text>}
        renderItem={({ item }) => (
          <TakeCard
            take={item}
            onLike={() => {}}
            onProfile={(uid) => nav.navigate('Profile', { userId: uid })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  list: { padding: 14, paddingBottom: 40 },
  profileHeader: { gap: 10, marginBottom: 20, alignItems: 'center' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1f6feb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '700' },
  profileName: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileBio: { color: '#888', fontSize: 14, textAlign: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 4 },
  statItem: { alignItems: 'center', gap: 4 },
  statNum: { color: '#fff', fontSize: 18, fontWeight: '700' },
  statLabel: { color: '#555', fontSize: 12 },
  statDivider: { width: 1, height: 30, backgroundColor: '#2a2a2a' },
  selfActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  editBtn: {
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editBtnText: { color: '#ccc', fontWeight: '600', fontSize: 13 },
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  signOutText: { color: '#ef4444', fontWeight: '600', fontSize: 13 },
  takesHeader: { color: '#888', fontWeight: '700', fontSize: 14, alignSelf: 'flex-start', marginTop: 10 },
  editForm: { width: '100%', gap: 8 },
  editInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    fontSize: 14,
  },
  saveError: { color: '#ef4444', fontSize: 13 },
  editButtons: { flexDirection: 'row', gap: 10 },
  saveBtn: {
    flex: 1,
    backgroundColor: '#1f6feb',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#333',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: { color: '#888', fontWeight: '600' },
  empty: { color: '#555', textAlign: 'center', marginTop: 20 },
});
