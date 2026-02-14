import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { api } from './src/lib/api';

const TOKEN_KEY = 'pathstream_mobile_token';
const Tab = createBottomTabNavigator();

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function Banner({ message, onDismiss }) {
  if (!message) {
    return null;
  }

  const isError = message.type === 'error';
  return (
    <View style={[styles.banner, isError ? styles.bannerError : styles.bannerSuccess]}>
      <Text style={styles.bannerText}>{message.text}</Text>
      <Pressable onPress={onDismiss} style={styles.bannerDismiss}>
        <Text style={styles.bannerDismissText}>×</Text>
      </Pressable>
    </View>
  );
}

function AuthScreen({ onSignIn, loading, error }) {
  const [email, setEmail] = useState('demo@pathstream.app');
  const [password, setPassword] = useState('password123');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.authWrap}>
        <Text style={styles.title}>2dpunch Mobile</Text>
        <Text style={styles.subtitle}>Phase 3 · Expo</Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          style={styles.input}
          value={email}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable disabled={loading} onPress={() => onSignIn({ email, password })} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ForYouScreen({ clips, onRefresh, refreshing, onOpenVideo }) {
  return (
    <FlatList
      contentContainerStyle={styles.listPad}
      data={clips}
      keyExtractor={(item) => item.id}
      onRefresh={onRefresh}
      refreshing={refreshing}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.muted}>{item.caption}</Text>
          <Text style={styles.muted}>@{item.creator?.username} · {item.durationSeconds}s</Text>
          <Pressable onPress={() => onOpenVideo(item.fullVideoId)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Watch Full</Text>
          </Pressable>
        </View>
      )}
      ListHeaderComponent={<SectionTitle>For You</SectionTitle>}
      ListEmptyComponent={<Text style={styles.muted}>No clips found.</Text>}
    />
  );
}

function WatchroomScreen({
  selectedVideo,
  watchroom,
  onOpenVideo,
  onRefresh,
  refreshing,
  query,
  onQueryChange,
  onRunSearch,
  searchResults,
  searchLoading,
  progress,
  onProgressChange,
  onSaveProgress,
  progressLoading
}) {
  return (
    <ScrollView contentContainerStyle={styles.listPad}>
      <SectionTitle>Watchroom</SectionTitle>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Search</Text>
        <TextInput onChangeText={onQueryChange} placeholder="Search clips, videos, creators" style={styles.input} value={query} />
        <Pressable disabled={searchLoading} onPress={onRunSearch} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{searchLoading ? 'Searching...' : 'Search'}</Text>
        </Pressable>
        {searchResults ? (
          <Text style={styles.muted}>
            Clips: {searchResults.clips.length} · Videos: {searchResults.fullVideos.length} · Creators: {searchResults.creators.length}
          </Text>
        ) : null}
      </View>

      {selectedVideo ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selectedVideo.title}</Text>
          <Text style={styles.muted}>{selectedVideo.description}</Text>
          <Text style={styles.muted}>{selectedVideo.durationMinutes} min</Text>
          <TextInput
            keyboardType="numeric"
            onChangeText={onProgressChange}
            placeholder="Progress %"
            style={styles.input}
            value={progress}
          />
          <Pressable disabled={progressLoading} onPress={onSaveProgress} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{progressLoading ? 'Saving...' : 'Save Progress'}</Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable disabled={refreshing} onPress={onRefresh} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>{refreshing ? 'Refreshing...' : 'Refresh Watchroom'}</Text>
      </Pressable>

      <SectionTitle>Trending Full Videos</SectionTitle>
      {(watchroom?.trending || []).map((video) => (
        <View key={video.id} style={styles.card}>
          <Text style={styles.cardTitle}>{video.title}</Text>
          <Text style={styles.muted}>@{video.creator?.username} · {video.durationMinutes} min</Text>
          <Pressable onPress={() => onOpenVideo(video.id)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Open</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

function CreateScreen({ latestFullVideoId, onCreateFullVideo, onCreateClip, createFullLoading, createClipLoading }) {
  const [fullTitle, setFullTitle] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [fullDuration, setFullDuration] = useState('');
  const [clipTitle, setClipTitle] = useState('');
  const [clipCaption, setClipCaption] = useState('');
  const [clipDuration, setClipDuration] = useState('');
  const [clipTags, setClipTags] = useState('');
  const [clipFullVideoId, setClipFullVideoId] = useState(latestFullVideoId || '');

  useEffect(() => {
    if (!clipFullVideoId && latestFullVideoId) {
      setClipFullVideoId(latestFullVideoId);
    }
  }, [latestFullVideoId, clipFullVideoId]);

  async function submitFullVideo() {
    if (!fullTitle.trim() || !fullDescription.trim() || !fullDuration.trim()) {
      return;
    }

    await onCreateFullVideo({
      title: fullTitle.trim(),
      description: fullDescription.trim(),
      durationMinutes: Number(fullDuration)
    });
    setFullTitle('');
    setFullDescription('');
    setFullDuration('');
  }

  async function submitClip() {
    if (!clipTitle.trim() || !clipCaption.trim() || !clipDuration.trim() || !clipFullVideoId.trim()) {
      return;
    }

    await onCreateClip({
      title: clipTitle.trim(),
      caption: clipCaption.trim(),
      durationSeconds: Number(clipDuration),
      fullVideoId: clipFullVideoId.trim(),
      tags: clipTags
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    });

    setClipTitle('');
    setClipCaption('');
    setClipDuration('');
    setClipTags('');
  }

  return (
    <ScrollView contentContainerStyle={styles.listPad}>
      <SectionTitle>Create</SectionTitle>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Full Video</Text>
        <TextInput onChangeText={setFullTitle} placeholder="Title" style={styles.input} value={fullTitle} />
        <TextInput onChangeText={setFullDescription} placeholder="Description" style={styles.input} value={fullDescription} />
        <TextInput
          keyboardType="numeric"
          onChangeText={setFullDuration}
          placeholder="Duration (minutes)"
          style={styles.input}
          value={fullDuration}
        />
        <Pressable disabled={createFullLoading} onPress={submitFullVideo} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{createFullLoading ? 'Publishing...' : 'Publish Full Video'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Teaser Clip</Text>
        <TextInput onChangeText={setClipTitle} placeholder="Clip title" style={styles.input} value={clipTitle} />
        <TextInput onChangeText={setClipCaption} placeholder="Caption" style={styles.input} value={clipCaption} />
        <TextInput
          keyboardType="numeric"
          onChangeText={setClipDuration}
          placeholder="Duration (seconds)"
          style={styles.input}
          value={clipDuration}
        />
        <TextInput
          onChangeText={setClipFullVideoId}
          placeholder="Full video ID"
          style={styles.input}
          value={clipFullVideoId}
        />
        <TextInput onChangeText={setClipTags} placeholder="Tags comma-separated" style={styles.input} value={clipTags} />
        <Pressable disabled={createClipLoading} onPress={submitClip} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{createClipLoading ? 'Publishing...' : 'Publish Clip'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function InboxScreen({ items, onRefresh, refreshing }) {
  return (
    <ScrollView contentContainerStyle={styles.listPad}>
      <SectionTitle>Inbox</SectionTitle>
      <Pressable disabled={refreshing} onPress={onRefresh} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>{refreshing ? 'Refreshing...' : 'Refresh Inbox'}</Text>
      </Pressable>
      {items.length ? (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.type?.toUpperCase?.() || 'ACTIVITY'}</Text>
            <Text style={styles.muted}>{item.text}</Text>
          </View>
        ))
      ) : (
        <Text style={styles.muted}>No activity yet.</Text>
      )}
    </ScrollView>
  );
}

function ProfileScreen({
  user,
  analytics,
  onRefreshAnalytics,
  analyticsLoading,
  onLogout,
  onLogoutAll,
  logoutLoading,
  logoutAllLoading
}) {
  return (
    <ScrollView contentContainerStyle={styles.listPad}>
      <SectionTitle>Profile</SectionTitle>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>@{user.username}</Text>
        <Text style={styles.muted}>{user.email}</Text>
        <Text style={styles.muted}>Following: {user.followingCreatorIds.length}</Text>
        <Text style={styles.muted}>Liked clips: {user.likedClipIds.length}</Text>
        <Text style={styles.muted}>Watchlist: {user.watchlistVideoIds.length}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Creator Analytics</Text>
        {analyticsLoading ? <ActivityIndicator /> : null}
        {analytics ? (
          <>
            <Text style={styles.muted}>Clips: {analytics.clipsCount}</Text>
            <Text style={styles.muted}>Full videos: {analytics.fullVideosCount}</Text>
            <Text style={styles.muted}>Clip likes: {analytics.totalClipLikes}</Text>
            <Text style={styles.muted}>Clip comments: {analytics.totalClipComments}</Text>
            <Text style={styles.muted}>Full video plays: {analytics.totalFullVideoPlays}</Text>
          </>
        ) : (
          <Text style={styles.muted}>No analytics yet.</Text>
        )}
        <Pressable disabled={analyticsLoading} onPress={onRefreshAnalytics} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{analyticsLoading ? 'Refreshing...' : 'Refresh Analytics'}</Text>
        </Pressable>
      </View>

      <Pressable disabled={logoutLoading} onPress={onLogout} style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>{logoutLoading ? 'Logging out...' : 'Logout'}</Text>
      </Pressable>
      <Pressable disabled={logoutAllLoading} onPress={onLogoutAll} style={styles.dangerButton}>
        <Text style={styles.primaryButtonText}>{logoutAllLoading ? 'Logging out all...' : 'Logout All Devices'}</Text>
      </Pressable>
    </ScrollView>
  );
}

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [clips, setClips] = useState([]);
  const [watchroom, setWatchroom] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [authError, setAuthError] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [progress, setProgress] = useState('50');
  const [inboxItems, setInboxItems] = useState([]);
  const [inboxRefreshing, setInboxRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [banner, setBanner] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [createFullLoading, setCreateFullLoading] = useState(false);
  const [createClipLoading, setCreateClipLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  const signedIn = useMemo(() => Boolean(token && user), [token, user]);
  const latestFullVideoId = useMemo(() => watchroom?.trending?.[0]?.id || '', [watchroom]);

  function showError(error, fallback) {
    const message = error instanceof Error ? error.message : fallback;
    setBanner({ type: 'error', text: message || fallback || 'Something went wrong' });
  }

  function showSuccess(text) {
    setBanner({ type: 'success', text });
  }

  async function refreshCore(sessionToken) {
    const [me, feed, watch] = await Promise.all([
      api.me(sessionToken),
      api.shortsFeed(sessionToken),
      api.watchroom(sessionToken)
    ]);

    setUser(me.user);
    setClips(feed.items);
    setWatchroom(watch);
  }

  useEffect(() => {
    async function bootstrap() {
      const savedToken = await AsyncStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setLoadingAuth(false);
        return;
      }

      try {
        await refreshCore(savedToken);
        setToken(savedToken);
      } catch {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoadingAuth(false);
      }
    }

    bootstrap();
  }, []);

  useEffect(() => {
    if (!signedIn) {
      return;
    }

    refreshInbox();
    refreshAnalytics();
  }, [signedIn]);

  async function handleSignIn(credentials) {
    setAuthError('');
    setLoadingAuth(true);
    try {
      const response = await api.signin(credentials);
      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      await refreshCore(response.token);
      showSuccess('Signed in successfully.');
    } catch (error) {
      setAuthError(error.message);
      showError(error, 'Sign in failed');
    } finally {
      setLoadingAuth(false);
    }
  }

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      if (token) {
        try {
          await api.logout(token);
        } catch {
          // ignore logout request failures on local reset
        }
      }
      await AsyncStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setClips([]);
      setWatchroom(null);
      setSelectedVideo(null);
      setInboxItems([]);
      setAnalytics(null);
      setSearchResults(null);
      showSuccess('Logged out.');
    } finally {
      setLogoutLoading(false);
    }
  }

  async function handleLogoutAll() {
    setLogoutAllLoading(true);
    try {
      if (token) {
        await api.logoutAll(token);
      }
      await handleLogout();
    } catch (error) {
      showError(error, 'Logout all failed');
    } finally {
      setLogoutAllLoading(false);
    }
  }

  async function handleOpenVideo(videoId) {
    if (!token) {
      return;
    }
    try {
      const video = await api.fullVideoById(token, videoId);
      setSelectedVideo(video);
    } catch (error) {
      showError(error, 'Could not open video');
    }
  }

  async function handleRefresh() {
    if (!token) {
      return;
    }
    setRefreshing(true);
    try {
      await refreshCore(token);
    } catch (error) {
      showError(error, 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSearch() {
    if (!token || !searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await api.search(token, searchQuery.trim());
      setSearchResults(response);
    } catch (error) {
      showError(error, 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSaveProgress() {
    if (!token || !selectedVideo?.id) {
      return;
    }

    setProgressLoading(true);
    try {
      await api.updateProgress(token, selectedVideo.id, Number(progress));
      const refreshedWatchroom = await api.watchroom(token);
      setWatchroom(refreshedWatchroom);
      showSuccess('Progress saved.');
    } catch (error) {
      showError(error, 'Could not save progress');
    } finally {
      setProgressLoading(false);
    }
  }

  async function handleCreateFullVideo(payload) {
    if (!token) {
      return;
    }

    setCreateFullLoading(true);
    try {
      await api.createFullVideo(token, payload);
      await handleRefresh();
      showSuccess('Full video published.');
    } catch (error) {
      showError(error, 'Could not create full video');
    } finally {
      setCreateFullLoading(false);
    }
  }

  async function handleCreateClip(payload) {
    if (!token) {
      return;
    }

    setCreateClipLoading(true);
    try {
      await api.createClip(token, payload);
      await handleRefresh();
      showSuccess('Clip published.');
    } catch (error) {
      showError(error, 'Could not create clip');
    } finally {
      setCreateClipLoading(false);
    }
  }

  async function refreshInbox() {
    if (!token) {
      return;
    }

    setInboxRefreshing(true);
    try {
      const response = await api.inboxActivity(token);
      setInboxItems(response.items);
    } catch (error) {
      showError(error, 'Could not load inbox');
    } finally {
      setInboxRefreshing(false);
    }
  }

  async function refreshAnalytics() {
    if (!token) {
      return;
    }

    setAnalyticsLoading(true);
    try {
      const response = await api.creatorAnalytics(token);
      setAnalytics(response);
    } catch (error) {
      showError(error, 'Could not load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }

  if (loadingAuth) {
    return (
      <SafeAreaView style={styles.safeAreaLoading}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (!signedIn) {
    return <AuthScreen error={authError} loading={loadingAuth} onSignIn={handleSignIn} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Banner message={banner} onDismiss={() => setBanner(null)} />
      <NavigationContainer>
        <Tab.Navigator screenOptions={{ headerShown: false }}>
          <Tab.Screen name="ForYou">
            {() => <ForYouScreen clips={clips} onOpenVideo={handleOpenVideo} onRefresh={handleRefresh} refreshing={refreshing} />}
          </Tab.Screen>
          <Tab.Screen name="Watchroom">
            {() => (
              <WatchroomScreen
                onOpenVideo={handleOpenVideo}
                onProgressChange={setProgress}
                onQueryChange={setSearchQuery}
                onRefresh={handleRefresh}
                onRunSearch={handleSearch}
                onSaveProgress={handleSaveProgress}
                progress={progress}
                progressLoading={progressLoading}
                query={searchQuery}
                refreshing={refreshing}
                searchLoading={searchLoading}
                searchResults={searchResults}
                selectedVideo={selectedVideo}
                watchroom={watchroom}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Create">
            {() => (
              <CreateScreen
                createClipLoading={createClipLoading}
                createFullLoading={createFullLoading}
                latestFullVideoId={latestFullVideoId}
                onCreateClip={handleCreateClip}
                onCreateFullVideo={handleCreateFullVideo}
              />
            )}
          </Tab.Screen>
          <Tab.Screen name="Inbox">
            {() => <InboxScreen items={inboxItems} onRefresh={refreshInbox} refreshing={inboxRefreshing} />}
          </Tab.Screen>
          <Tab.Screen name="Profile">
            {() => (
              <ProfileScreen
                analytics={analytics}
                analyticsLoading={analyticsLoading}
                logoutAllLoading={logoutAllLoading}
                logoutLoading={logoutLoading}
                onLogout={handleLogout}
                onLogoutAll={handleLogoutAll}
                onRefreshAnalytics={refreshAnalytics}
                user={user}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#f5f5f5',
    flex: 1
  },
  safeAreaLoading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  authWrap: {
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    padding: 20
  },
  title: {
    fontSize: 26,
    fontWeight: '700'
  },
  subtitle: {
    color: '#6b7280',
    marginBottom: 12
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#d1d5db',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    marginTop: 6,
    padding: 12
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#b91c1c',
    borderRadius: 10,
    marginTop: 6,
    padding: 12
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    marginTop: 8,
    padding: 10
  },
  secondaryButtonText: {
    color: '#111827',
    fontWeight: '600'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700'
  },
  listPad: {
    gap: 10,
    padding: 16,
    paddingBottom: 24
  },
  card: {
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4
  },
  muted: {
    color: '#6b7280'
  },
  error: {
    color: '#b91c1c'
  },
  banner: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10
  },
  bannerError: {
    backgroundColor: '#fee2e2'
  },
  bannerSuccess: {
    backgroundColor: '#dcfce7'
  },
  bannerText: {
    color: '#111827',
    flex: 1,
    fontWeight: '600'
  },
  bannerDismiss: {
    marginLeft: 10,
    paddingHorizontal: 6
  },
  bannerDismissText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700'
  }
});