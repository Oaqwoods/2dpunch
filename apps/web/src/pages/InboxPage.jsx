export default function InboxPage({ items, loading }) {
  return (
    <section className="page-layout panel">
      <h2>Inbox</h2>
      <p>Activity and notifications.</p>
      {loading ? <p>Loading...</p> : null}
      {!loading && !items.length ? <p className="empty">No activity yet.</p> : null}
      <ul>
        {items.map((item) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
    </section>
  );
}