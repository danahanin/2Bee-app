function percent(value) {
  return `${Math.round((value || 0) * 100)}%`
}

function HiveSuggestionPanel({ suggestion, selectedGroupId, onSelect }) {
  const alternatives = suggestion?.alternatives || []

  if (!suggestion?.expenseGroupId && alternatives.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">Hive group needed</p>
        <p className="mt-1 text-sm text-amber-800">
          No active hive groups were found for this receipt. Add groups in Settings before saving it as shared.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Suggested hive</p>
          <p className="mt-1 text-sm text-slate-600">
            {suggestion.groupName || 'Choose a hive group'}
            {suggestion.confidence != null && (
              <span className="ml-2 text-xs font-medium text-slate-400">{percent(suggestion.confidence)}</span>
            )}
          </p>
        </div>
      </div>

      {suggestion.reasoning && (
        <p className="mb-3 rounded-lg bg-white px-3 py-2 text-xs text-slate-600">{suggestion.reasoning}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {alternatives.map((item) => {
          const isSelected = selectedGroupId === item.groupId
          return (
            <button
              key={item.groupId}
              type="button"
              onClick={() => onSelect(item.groupId)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {item.name}
              <span className={isSelected ? 'ml-1 text-indigo-100' : 'ml-1 text-slate-400'}>
                {percent(item.score)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default HiveSuggestionPanel
