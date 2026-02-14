import { useEffect, useState } from 'react';

export default function ForYouPage({
  clips,
  feedMode,
  onChangeFeedMode,
  onLike,
  onFollow,
  onOpenFull,
  onLoadComments,
  onAddComment
}) {
  const [expandedClipId, setExpandedClipId] = useState(null);
  const [comments, setComments] = useState([]);
  const [draftComment, setDraftComment] = useState('');

  useEffect(() => {
    setComments([]);
    setDraftComment('');
  }, [expandedClipId]);

  async function openComments(clipId) {
    if (expandedClipId === clipId) {
      setExpandedClipId(null);
      return;
    }

    setExpandedClipId(clipId);
    const payload = await onLoadComments(clipId);
    setComments(payload.items);
  }

  async function submitComment(clipId) {
    if (!draftComment.trim()) {
      return;
    }

    const created = await onAddComment(clipId, draftComment.trim());
    setComments((prev) => [...prev, created]);
    setDraftComment('');
  }

  return (
    <section className="page-layout">
      <div className="panel">
        <h2>Feed</h2>
        <p>Discover shorts and convert into full-video sessions.</p>
        <div className="auth-mode-row">
          <button className={feedMode === 'foryou' ? 'active' : ''} onClick={() => onChangeFeedMode('foryou')} type="button">
            For You
          </button>
          <button
            className={feedMode === 'following' ? 'active' : ''}
            onClick={() => onChangeFeedMode('following')}
            type="button"
          >
            Following
          </button>
        </div>
      </div>
      {!clips.length ? <p className="empty panel">No clips in this feed yet.</p> : null}
      {clips.map((clip) => (
        <article key={clip.id} className="clip-card">
          <div className="clip-video-placeholder">
            <span>{clip.durationSeconds}s short</span>
          </div>

          <div className="clip-content">
            <h3>{clip.title}</h3>
            <p>{clip.caption}</p>
            <p className="meta-row">
              @{clip.creator?.username} · {clip.tags.join(' #')}
            </p>

            <div className="cta-row">
              <button className="primary" onClick={() => onOpenFull(clip.fullVideoId)} type="button">
                Watch Full
              </button>
              <button onClick={() => onLike(clip.id)} type="button">
                {clip.likedByMe ? 'Unlike' : 'Like'}
              </button>
              <button onClick={() => onFollow(clip.creatorId)} type="button">
                Follow
              </button>
              <button onClick={() => openComments(clip.id)} type="button">
                Comments ({clip.commentsCount})
              </button>
            </div>

            {expandedClipId === clip.id && (
              <div className="comment-box">
                {comments.length ? (
                  comments.map((comment) => (
                    <p key={comment.id}>
                      <strong>@{comment.user?.username || 'user'}:</strong> {comment.text}
                    </p>
                  ))
                ) : (
                  <p>No comments yet.</p>
                )}

                <div className="comment-compose">
                  <input
                    placeholder="Write a comment"
                    value={draftComment}
                    onChange={(event) => setDraftComment(event.target.value)}
                  />
                  <button onClick={() => submitComment(clip.id)} type="button">
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}