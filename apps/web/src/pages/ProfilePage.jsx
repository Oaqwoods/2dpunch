export default function ProfilePage({ user, analytics, onLogout, onLogoutAll }) {
  return (
    <section className="page-layout panel">
      <h2>Profile</h2>
      <p>
        <strong>@{user.username}</strong>
      </p>
      <p>{user.email}</p>
      <p>Following creators: {user.followingCreatorIds.length}</p>
      <p>Liked clips: {user.likedClipIds.length}</p>
      <p>Watchlist videos: {user.watchlistVideoIds.length}</p>

      <h3>Creator Analytics</h3>
      {analytics ? (
        <>
          <p>Clips: {analytics.clipsCount}</p>
          <p>Full videos: {analytics.fullVideosCount}</p>
          <p>Total clip likes: {analytics.totalClipLikes}</p>
          <p>Total clip comments: {analytics.totalClipComments}</p>
          <p>Total full-video plays: {analytics.totalFullVideoPlays}</p>
        </>
      ) : (
        <p>Loading analytics...</p>
      )}

      <div className="cta-row">
        <button onClick={onLogout} type="button">
          Logout
        </button>
        <button className="danger" onClick={onLogoutAll} type="button">
          Logout all devices
        </button>
      </div>
    </section>
  );
}