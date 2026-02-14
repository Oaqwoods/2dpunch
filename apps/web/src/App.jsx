import { useEffect, useMemo, useState } from 'react';
import AuthPage from './components/AuthPage.jsx';
import TabBar from './components/TabBar.jsx';
import { api, getToken, setToken } from './lib/api.js';
import CreatePage from './pages/CreatePage.jsx';
import ForYouPage from './pages/ForYouPage.jsx';
import InboxPage from './pages/InboxPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import WatchroomPage from './pages/WatchroomPage.jsx';

export default function App() {
  const [token, setSessionToken] = useState(getToken());
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('foryou');
  const [feedMode, setFeedMode] = useState('foryou');
  const [clips, setClips] = useState([]);
  const [watchroom, setWatchroom] = useState(null);
  const [selectedFullVideoId, setSelectedFullVideoId] = useState(null);
  const [selectedFullVideo, setSelectedFullVideo] = useState(null);
  const [progressDraft, setProgressDraft] = useState('50');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [inboxItems, setInboxItems] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  const signedIn = Boolean(token && user);

  const latestFullVideoId = useMemo(() => watchroom?.trending?.[0]?.id || null, [watchroom]);

  async function loadFeed(sessionToken, mode) {
    const payload = mode === 'following' ? await api.followingFeed(sessionToken) : await api.shortsFeed(sessionToken);
    setClips(payload.items);
  }

  async function refreshAuthedData(sessionToken) {
    const [mePayload, watchroomPayload, inboxPayload, analyticsPayload] = await Promise.all([
      api.me(sessionToken),
      api.watchroom(sessionToken),
      api.inboxActivity(sessionToken),
      api.creatorAnalytics(sessionToken)
    ]);

    setUser(mePayload.user);
    setWatchroom(watchroomPayload);
    setInboxItems(inboxPayload.items);
    setAnalytics(analyticsPayload);
    await loadFeed(sessionToken, feedMode);
  }

  useEffect(() => {
    if (!token) {
      setUser(null);
      setClips([]);
      setWatchroom(null);
      setInboxItems([]);
      setAnalytics(null);
      return;
    }

    refreshAuthedData(token).catch(() => {
      setToken(null);
      setSessionToken(null);
    });
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    loadFeed(token, feedMode).catch(() => {
      setToken(null);
      setSessionToken(null);
    });
  }, [feedMode]);

  useEffect(() => {
    if (!token || activeTab !== 'inbox') {
      return;
    }

    refreshInbox();
  }, [activeTab, token]);

  async function handleSignin(credentials) {
    try {
      setAuthError('');
      const payload = await api.signin(credentials);
      setToken(payload.token);
      setSessionToken(payload.token);
      setUser(payload.user);
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function handleSignup(form) {
    try {
      setAuthError('');
      const payload = await api.signup(form);
      setToken(payload.token);
      setSessionToken(payload.token);
      setUser(payload.user);
    } catch (error) {
      setAuthError(error.message);
    }
  }

  async function handleLogout() {
    await api.logout(token);
    setToken(null);
    setSessionToken(null);
    setUser(null);
  }

  async function handleLogoutAll() {
    await api.logoutAll(token);
    setToken(null);
    setSessionToken(null);
    setUser(null);
  }

  async function likeClip(clipId) {
    await api.toggleLikeClip(token, clipId);
    await loadFeed(token, feedMode);
  }

  async function followCreator(creatorId) {
    await api.toggleFollow(token, creatorId);
    const mePayload = await api.me(token);
    setUser(mePayload.user);
  }

  async function openFullVideo(fullVideoId) {
    setSelectedFullVideoId(fullVideoId);
    const payload = await api.fullVideoById(token, fullVideoId);
    setSelectedFullVideo(payload);
    setActiveTab('watchroom');
  }

  async function toggleWatchlist(fullVideoId) {
    await api.toggleWatchlist(token, fullVideoId);
    const watchroomPayload = await api.watchroom(token);
    setWatchroom(watchroomPayload);
  }

  async function saveProgress() {
    if (!selectedFullVideoId) {
      return;
    }

    await api.updateProgress(token, selectedFullVideoId, Number(progressDraft));
    const watchroomPayload = await api.watchroom(token);
    setWatchroom(watchroomPayload);
  }

  async function createFullVideo(body) {
    await api.createFullVideo(token, body);
    const watchroomPayload = await api.watchroom(token);
    setWatchroom(watchroomPayload);
  }

  async function createClip(body) {
    await api.createClip(token, body);
    await loadFeed(token, feedMode);
  }

  async function runSearch() {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const payload = await api.search(token, searchQuery.trim());
    setSearchResults(payload);
  }

  async function refreshInbox() {
    setInboxLoading(true);
    try {
      const payload = await api.inboxActivity(token);
      setInboxItems(payload.items);
    } finally {
      setInboxLoading(false);
    }
  }

  if (!signedIn) {
    return <AuthPage onSignIn={handleSignin} onSignUp={handleSignup} error={authError} />;
  }

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <h1>2dpunch · PathStream</h1>
          <p>Clip-to-full hybrid video app</p>
        </div>
        <p>Signed in as @{user.username}</p>
      </header>

      <main className="content-area">
        {activeTab === 'foryou' ? (
          <ForYouPage
            clips={clips}
            feedMode={feedMode}
            onChangeFeedMode={setFeedMode}
            onLike={likeClip}
            onFollow={followCreator}
            onOpenFull={openFullVideo}
            onLoadComments={(clipId) => api.clipComments(token, clipId)}
            onAddComment={(clipId, text) => api.addClipComment(token, clipId, text)}
          />
        ) : null}

        {activeTab === 'watchroom' ? (
          <WatchroomPage
            data={watchroom}
            selectedVideo={selectedFullVideo}
            progressDraft={progressDraft}
            onProgressChange={setProgressDraft}
            onSaveProgress={saveProgress}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchResults={searchResults}
            onRunSearch={runSearch}
            onOpenFull={openFullVideo}
            onToggleWatchlist={toggleWatchlist}
          />
        ) : null}

        {activeTab === 'create' ? (
          <CreatePage onCreateFullVideo={createFullVideo} onCreateClip={createClip} latestFullVideoId={latestFullVideoId} />
        ) : null}

        {activeTab === 'inbox' ? <InboxPage items={inboxItems} loading={inboxLoading} /> : null}

        {activeTab === 'profile' ? (
          <ProfilePage user={user} analytics={analytics} onLogout={handleLogout} onLogoutAll={handleLogoutAll} />
        ) : null}
      </main>

      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}