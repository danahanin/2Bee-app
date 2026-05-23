const TOGGLES = [
  {
    key: 'budgetAlerts',
    label: 'Budget alerts',
    description: 'Notify when approaching budget limit.',
  },
  {
    key: 'imbalanceAlerts',
    label: 'Imbalance alerts',
    description: 'Notify when Hive contributions are unbalanced.',
  },
  {
    key: 'newExpenseAlerts',
    label: 'New expense alerts',
    description: 'Notify when partner adds a shared expense.',
  },
  {
    key: 'weeklyDigest',
    label: 'Weekly digest',
    description: 'Receive a weekly summary email.',
  },
]

function NotificationSettings({ settings, loading, savingMap, onToggle }) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-slate-900">Notifications</h3>
      {TOGGLES.map((toggle) => {
        const checked = Boolean(settings[toggle.key])
        const saving = Boolean(savingMap[toggle.key])

        return (
          <label
            key={toggle.key}
            className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <span>
              <span className="block text-sm font-medium text-slate-800">{toggle.label}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{toggle.description}</span>
            </span>
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checked}
                disabled={saving}
                onChange={(event) => onToggle(toggle.key, event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
              />
            </span>
          </label>
        )
      })}
    </section>
  )
}

export default NotificationSettings
