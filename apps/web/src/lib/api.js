const API_BASE = 'http://localhost:4000';
const TOKEN_KEY = 'pathstream_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (!token) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
}

async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }

  return payload;
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body }),
  signin: (body) => request('/auth/signin', { method: 'POST', body }),
  me: (token) => request('/auth/me', { token }),
  logout: (token) => request('/auth/logout', { method: 'POST', token }),
  logoutAll: (token) => request('/auth/logout-all', { method: 'POST', token }),
  shortsFeed: (token) => request('/feed/shorts', { token }),
  followingFeed: (token) => request('/feed/following', { token }),
  watchroom: (token) => request('/watchroom', { token }),
  fullVideoById: (token, fullVideoId) => request(`/videos/full/${fullVideoId}`, { token }),
  updateProgress: (token, fullVideoId, progressPercent) =>
    request(`/videos/full/${fullVideoId}/progress`, {
      token,
      method: 'POST',
      body: { progressPercent }
    }),
  clipComments: (token, clipId) => request(`/comments/clips/${clipId}`, { token }),
  addClipComment: (token, clipId, text) =>
    request(`/comments/clips/${clipId}`, {
      token,
      method: 'POST',
      body: { text }
    }),
  toggleLikeClip: (token, clipId) =>
    request(`/interactions/clips/${clipId}/like`, {
      token,
      method: 'POST'
    }),
  toggleWatchlist: (token, fullVideoId) =>
    request(`/interactions/videos/${fullVideoId}/watchlist`, {
      token,
      method: 'POST'
    }),
  toggleFollow: (token, creatorId) =>
    request(`/interactions/creators/${creatorId}/follow`, {
      token,
      method: 'POST'
    }),
  createFullVideo: (token, body) => request('/creator/full-videos', { token, method: 'POST', body }),
  createClip: (token, body) => request('/creator/clips', { token, method: 'POST', body }),
  search: (token, query) => request(`/search?q=${encodeURIComponent(query)}`, { token }),
  inboxActivity: (token) => request('/inbox/activity', { token }),
  creatorAnalytics: (token) => request('/creator/me/analytics', { token })
};