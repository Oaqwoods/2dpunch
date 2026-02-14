const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', token, body } = {}) {
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
  signin: (body) => request('/auth/signin', { method: 'POST', body }),
  me: (token) => request('/auth/me', { token }),
  logout: (token) => request('/auth/logout', { token, method: 'POST' }),
  logoutAll: (token) => request('/auth/logout-all', { token, method: 'POST' }),
  shortsFeed: (token) => request('/feed/shorts', { token }),
  watchroom: (token) => request('/watchroom', { token }),
  fullVideoById: (token, fullVideoId) => request(`/videos/full/${fullVideoId}`, { token }),
  createFullVideo: (token, body) => request('/creator/full-videos', { token, method: 'POST', body }),
  createClip: (token, body) => request('/creator/clips', { token, method: 'POST', body }),
  inboxActivity: (token) => request('/inbox/activity', { token }),
  creatorAnalytics: (token) => request('/creator/me/analytics', { token }),
  updateProgress: (token, fullVideoId, progressPercent) =>
    request(`/videos/full/${fullVideoId}/progress`, {
      token,
      method: 'POST',
      body: { progressPercent }
    }),
  search: (token, query) => request(`/search?q=${encodeURIComponent(query)}`, { token })
};