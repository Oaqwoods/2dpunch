const tabs = [
  { id: 'foryou', label: 'For You' },
  { id: 'watchroom', label: 'Watchroom' },
  { id: 'create', label: 'Create' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'profile', label: 'Profile' }
];

export default function TabBar({ activeTab, onTabChange }) {
  return (
    <nav className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          onClick={() => onTabChange(tab.id)}
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}