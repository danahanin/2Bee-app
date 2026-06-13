const TOGGLES = [
  { key: 'budgetAlerts', label: 'Budget alerts', description: 'Buzz when approaching budget limit.' },
  { key: 'imbalanceAlerts', label: 'Imbalance alerts', description: 'Buzz when hive contributions are uneven.' },
  { key: 'newExpenseAlerts', label: 'New expense alerts', description: 'Buzz when partner logs shared nectar.' },
  { key: 'weeklyDigest', label: 'Weekly digest', description: 'A weekly hive summary email.' },
]

function NotificationSettings({ settings, loading, savingMap, onToggle }) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="hive-skeleton h-12" />
        <div className="hive-skeleton h-12" />
        <div className="hive-skeleton h-12" />
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <p className="hive-panel-sub">Choose which hive buzzes you want to hear.</p>
      {TOGGLES.map((toggle) => {
        const checked = Boolean(settings[toggle.key])
        const saving = Boolean(savingMap[toggle.key])
        return (
          <label key={toggle.key} className="hive-toggle-row hive-toggle-row-stacked">
            <span>
              <span className="block text-sm font-semibold text-[var(--chamber-accent-dark)]">{toggle.label}</span>
              <span className="mt-0.5 block text-xs opacity-70">{toggle.description}</span>
            </span>
            <input type="checkbox" checked={checked} disabled={saving} onChange={(e) => onToggle(toggle.key, e.target.checked)} className="hive-checkbox" />
          </label>
        )
      })}
    </section>
  )
}

export default NotificationSettings
