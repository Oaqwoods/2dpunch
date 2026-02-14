function VideoCard({ item, onOpenFull, onToggleWatchlist }) {
  return (
    <article className="watch-card">
      <h4>{item.title}</h4>
      <p>
        @{item.creator?.username} · {item.durationMinutes} min
      </p>
      {'progressPercent' in item ? <p>Progress: {item.progressPercent}%</p> : null}
      <div className="cta-row">
        <button className="primary" type="button" onClick={() => onOpenFull(item.id)}>
          Play
        </button>
        <button type="button" onClick={() => onToggleWatchlist(item.id)}>
          {item.inWatchlist ? 'Remove Watchlist' : 'Add Watchlist'}
        </button>
      </div>
    </article>
  );
}

function Row({ title, items, onOpenFull, onToggleWatchlist }) {
  return (
    <div className="watch-row">
      <h3>{title}</h3>
      {items.length ? (
        <div className="watch-grid">
          {items.map((item) => (
            <VideoCard key={item.id} item={item} onOpenFull={onOpenFull} onToggleWatchlist={onToggleWatchlist} />
          ))}
        </div>
      ) : (
        <p className="empty">No items yet.</p>
      )}
    </div>
  );
}

export default function WatchroomPage({
  data,
  selectedVideo,
  progressDraft,
  onProgressChange,
  onSaveProgress,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  onRunSearch,
  onOpenFull,
  onToggleWatchlist
}) {
  if (!data) {
    return <section className="page-layout">Loading watchroom...</section>;
  }

  return (
    <section className="page-layout">
      <div className="panel">
        <h3>Search library</h3>
        <div className="comment-compose">
          <input value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Search clips, full videos, creators" />
          <button type="button" onClick={onRunSearch}>
            Search
          </button>
        </div>
        {searchResults ? (
          <div className="search-grid">
            <p>Clips: {searchResults.clips.length}</p>
            <p>Full videos: {searchResults.fullVideos.length}</p>
            <p>Creators: {searchResults.creators.length}</p>
          </div>
        ) : null}
      </div>

      {selectedVideo ? (
        <div className="panel">
          <h3>Now Viewing Full Video</h3>
          <p>
            <strong>{selectedVideo.title}</strong>
          </p>
          <p>
            @{selectedVideo.creator?.username} · {selectedVideo.durationMinutes} min
          </p>
          <p>{selectedVideo.description}</p>
          <div className="comment-compose">
            <input
              type="number"
              min="0"
              max="100"
              value={progressDraft}
              onChange={(event) => onProgressChange(event.target.value)}
              placeholder="Progress %"
            />
            <button type="button" onClick={onSaveProgress}>
              Save progress
            </button>
          </div>
        </div>
      ) : null}

      <Row
        title="Continue Watching"
        items={data.continueWatching}
        onOpenFull={onOpenFull}
        onToggleWatchlist={onToggleWatchlist}
      />
      <Row title="From Shorts You Liked" items={data.fromLikedClips} onOpenFull={onOpenFull} onToggleWatchlist={onToggleWatchlist} />
      <Row title="Trending Full Videos" items={data.trending} onOpenFull={onOpenFull} onToggleWatchlist={onToggleWatchlist} />
    </section>
  );
}