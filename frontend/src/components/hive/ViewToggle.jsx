const TABS = [
  { key: 'shared', label: 'Our Hive', icon: '🍯' },
  { key: 'personal', label: 'My Expenses', icon: '🐝' },
  { key: 'balance', label: 'Balance', icon: '⚖️' },
]

function ViewToggle({ active, onChange }) {
  return (
    <div className="hive-view-toggle" role="tablist" aria-label="Hive views">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          onClick={() => onChange(tab.key)}
          className={`hive-view-tab ${active === tab.key ? 'hive-view-tab-active' : ''}`}
        >
          <span className="hive-view-tab-icon">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default ViewToggle
