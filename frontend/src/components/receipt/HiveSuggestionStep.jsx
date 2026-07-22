import HiveSuggestionPanel from './HiveSuggestionPanel.jsx'

function hasExpenseGroupOptions(suggestion) {
  if (!suggestion) return false
  if (suggestion.expenseGroupId) return true
  return Array.isArray(suggestion.alternatives) && suggestion.alternatives.some((item) => item?.groupId)
}

function hiveRecordId(hive) {
  if (!hive) return null
  return hive._id || hive.id || null
}

function HiveSuggestionStep({
  suggestion,
  selection,
  onSelect,
  hive,
  hiveId = null,
  hiveLoading = false,
  hiveError = null,
  errors = [],
}) {
  const hasGroups = hasExpenseGroupOptions(suggestion)
  const baseHiveId = hiveRecordId(hive) || hiveId || null
  const baseHiveLabel = hive?.name || 'General Hive'
  const isBaseHiveSelected =
    selection?.kind === 'defaultHive' && baseHiveId && selection.hiveId === String(baseHiveId)

  return (
    <div className="space-y-4" role="group" aria-label="Shared hive destination">
      {errors.length > 0 ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          {errors.map((err) => (
            <p key={err} className="text-sm text-rose-700">
              {err}
            </p>
          ))}
        </div>
      ) : null}

      {hasGroups ? (
        <HiveSuggestionPanel
          suggestion={suggestion}
          selectedGroupId={selection?.kind === 'expenseGroup' ? selection.expenseGroupId : null}
          onSelect={(groupId) => onSelect({ kind: 'expenseGroup', expenseGroupId: String(groupId) })}
        />
      ) : (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No ExpenseGroup subdivisions were suggested. You can save this shared expense to your general Hive.
        </p>
      )}

      {hiveLoading && !baseHiveId ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Loading your Hive…
        </div>
      ) : null}

      {!hiveLoading && hiveError && !baseHiveId ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {hiveError}
        </div>
      ) : null}

      {baseHiveId ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">General Hive</p>
          <p className="mb-3 text-xs text-slate-500">
            Your shared couple Hive. Use this when no ExpenseGroup subdivision is needed.
          </p>
          <button
            type="button"
            onClick={() => onSelect({ kind: 'defaultHive', hiveId: String(baseHiveId) })}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              isBaseHiveSelected
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
            }`}
            aria-pressed={isBaseHiveSelected}
          >
            {baseHiveLabel}
            <span className={isBaseHiveSelected ? 'ml-1 text-indigo-100' : 'ml-1 text-slate-400'}>
              base
            </span>
          </button>
        </div>
      ) : null}

      {!hiveLoading && !baseHiveId && !hasGroups ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Shared destination unavailable</p>
          <p className="mt-1 text-sm text-amber-800">
            Neither an ExpenseGroup nor your base Hive is available right now.
          </p>
        </div>
      ) : null}
    </div>
  )
}

export default HiveSuggestionStep
