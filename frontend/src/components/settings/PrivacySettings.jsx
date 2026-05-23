const TOGGLES = [
  {
    key: 'hidePersonalIncome',
    label: 'Hide personal income from partner',
    tooltip: 'Income fields are hidden from partner-facing views.',
  },
  {
    key: 'hidePersonalExpenses',
    label: 'Hide personal expenses from partner',
    tooltip: 'Personal-only expenses are removed from partner lists.',
  },
  {
    key: 'hidePersonalBalance',
    label: 'Hide personal balance from partner',
    tooltip: 'Personal balance values are removed from shared responses.',
  },
]

function PrivacySettings({ settings, loading, savingMap, onToggle }) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
      </div>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-slate-900">Privacy</h3>
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-700"
          title="Privacy preferences control what your partner can see."
        >
          i
        </span>
      </div>
      {TOGGLES.map((toggle) => {
        const checked = Boolean(settings[toggle.key])
        const saving = Boolean(savingMap[toggle.key])

        return (
          <label
            key={toggle.key}
            title={toggle.tooltip}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
          >
            <span className="text-sm text-slate-700">{toggle.label}</span>
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checked}
                disabled={saving}
                onChange={(event) => onToggle(toggle.key, event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400"
              />
            </span>
          </label>
        )
      })}
    </section>
  )
}

export default PrivacySettings
