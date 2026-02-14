import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/server.js';

const app = createApp();

test('auth, feed, watchroom, interaction, and creator flows work end-to-end', async () => {
  const signinResponse = await request(app).post('/auth/signin').send({
    email: 'demo@pathstream.app',
    password: 'password123'
  });

  assert.equal(signinResponse.status, 200);
  assert.ok(signinResponse.body.token);
  assert.equal(signinResponse.body.user.email, 'demo@pathstream.app');

  const token = signinResponse.body.token;

  const meResponse = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.user.username, 'demo_user');

  const shortsResponse = await request(app).get('/feed/shorts').set('Authorization', `Bearer ${token}`);
  assert.equal(shortsResponse.status, 200);
  assert.ok(Array.isArray(shortsResponse.body.items));
  assert.ok(shortsResponse.body.items.length > 0);

  const firstClip = shortsResponse.body.items[0];
  const firstVideoId = firstClip.fullVideoId;
  const firstCreatorId = firstClip.creatorId;

  const followingFeedResponse = await request(app)
    .get('/feed/following')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(followingFeedResponse.status, 200);
  assert.ok(Array.isArray(followingFeedResponse.body.items));

  const likeResponse = await request(app)
    .post(`/interactions/clips/${firstClip.id}/like`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(likeResponse.status, 200);
  assert.equal(typeof likeResponse.body.liked, 'boolean');

  const followResponse = await request(app)
    .post(`/interactions/creators/${firstCreatorId}/follow`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(followResponse.status, 200);
  assert.equal(typeof followResponse.body.following, 'boolean');

  const commentsResponse = await request(app)
    .get(`/comments/clips/${firstClip.id}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(commentsResponse.status, 200);
  assert.ok(Array.isArray(commentsResponse.body.items));

  const commentText = `Test comment ${Date.now()}`;
  const addCommentResponse = await request(app)
    .post(`/comments/clips/${firstClip.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ text: commentText });
  assert.equal(addCommentResponse.status, 201);
  assert.equal(addCommentResponse.body.text, commentText);

  const watchroomResponse = await request(app).get('/watchroom').set('Authorization', `Bearer ${token}`);
  assert.equal(watchroomResponse.status, 200);
  assert.ok(Array.isArray(watchroomResponse.body.trending));
  assert.ok(Array.isArray(watchroomResponse.body.continueWatching));

  const openVideoResponse = await request(app)
    .get(`/videos/full/${firstVideoId}`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(openVideoResponse.status, 200);
  assert.equal(openVideoResponse.body.id, firstVideoId);

  const progressResponse = await request(app)
    .post(`/videos/full/${firstVideoId}/progress`)
    .set('Authorization', `Bearer ${token}`)
    .send({ progressPercent: 66 });
  assert.equal(progressResponse.status, 200);
  assert.equal(progressResponse.body.progressPercent, 66);

  const toggleWatchlistResponse = await request(app)
    .post(`/interactions/videos/${firstVideoId}/watchlist`)
    .set('Authorization', `Bearer ${token}`);
  assert.equal(toggleWatchlistResponse.status, 200);
  assert.equal(typeof toggleWatchlistResponse.body.saved, 'boolean');

  const searchResponse = await request(app)
    .get('/search')
    .query({ q: 'workout' })
    .set('Authorization', `Bearer ${token}`);
  assert.equal(searchResponse.status, 200);
  assert.ok(Array.isArray(searchResponse.body.clips));
  assert.ok(Array.isArray(searchResponse.body.fullVideos));
  assert.ok(Array.isArray(searchResponse.body.creators));

  const createFullVideoResponse = await request(app)
    .post('/creator/full-videos')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Integration Test Full Video',
      description: 'Long-form upload test',
      durationMinutes: 12
    });
  assert.equal(createFullVideoResponse.status, 201);
  assert.ok(createFullVideoResponse.body.id);

  const createdFullVideoId = createFullVideoResponse.body.id;

  const createClipResponse = await request(app)
    .post('/creator/clips')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Integration Test Clip',
      caption: 'Clip linked to integration full video',
      durationSeconds: 22,
      fullVideoId: createdFullVideoId,
      tags: ['test', 'integration']
    });
  assert.equal(createClipResponse.status, 201);
  assert.equal(createClipResponse.body.fullVideoId, createdFullVideoId);

  const inboxResponse = await request(app).get('/inbox/activity').set('Authorization', `Bearer ${token}`);
  assert.equal(inboxResponse.status, 200);
  assert.ok(Array.isArray(inboxResponse.body.items));

  const analyticsResponse = await request(app)
    .get('/creator/me/analytics')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(analyticsResponse.status, 200);
  assert.equal(typeof analyticsResponse.body.clipsCount, 'number');

  const logoutResponse = await request(app).post('/auth/logout').set('Authorization', `Bearer ${token}`);
  assert.equal(logoutResponse.status, 204);

  const meAfterLogoutResponse = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
  assert.equal(meAfterLogoutResponse.status, 401);
});

test('logout-all invalidates every session for a user', async () => {
  const firstSignin = await request(app).post('/auth/signin').send({
    email: 'demo@pathstream.app',
    password: 'password123'
  });
  const secondSignin = await request(app).post('/auth/signin').send({
    email: 'demo@pathstream.app',
    password: 'password123'
  });

  assert.equal(firstSignin.status, 200);
  assert.equal(secondSignin.status, 200);

  const firstToken = firstSignin.body.token;
  const secondToken = secondSignin.body.token;

  const logoutAllResponse = await request(app)
    .post('/auth/logout-all')
    .set('Authorization', `Bearer ${secondToken}`);
  assert.equal(logoutAllResponse.status, 204);

  const meFromFirstToken = await request(app).get('/auth/me').set('Authorization', `Bearer ${firstToken}`);
  const meFromSecondToken = await request(app).get('/auth/me').set('Authorization', `Bearer ${secondToken}`);

  assert.equal(meFromFirstToken.status, 401);
  assert.equal(meFromSecondToken.status, 401);
});