const TOGGLES = [
  { key: 'hidePersonalIncome', label: 'Hide personal income from partner', tooltip: 'Income fields are hidden from partner-facing views.' },
  { key: 'hidePersonalExpenses', label: 'Hide personal expenses from partner', tooltip: 'Personal-only expenses are removed from partner lists.' },
  { key: 'hidePersonalBalance', label: 'Hide personal balance from partner', tooltip: 'Personal balance values are removed from shared responses.' },
]

function PrivacySettings({ settings, loading, savingMap, onToggle }) {
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
      <p className="hive-panel-sub">Control what your hive mate can see.</p>
      {TOGGLES.map((toggle) => {
        const checked = Boolean(settings[toggle.key])
        const saving = Boolean(savingMap[toggle.key])
        return (
          <label key={toggle.key} title={toggle.tooltip} className="hive-toggle-row">
            <span className="text-sm text-[var(--chamber-accent-dark)]">{toggle.label}</span>
            <input type="checkbox" checked={checked} disabled={saving} onChange={(e) => onToggle(toggle.key, e.target.checked)} className="hive-checkbox" />
          </label>
        )
      })}
    </section>
  )
}

export default PrivacySettings
