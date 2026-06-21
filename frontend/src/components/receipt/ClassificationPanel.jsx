function getConfidenceLabel(confidence) {
  if (confidence >= 0.8) return 'High'
  if (confidence >= 0.5) return 'Medium'
  return 'Low'
}

function ClassificationPanel({ classification, overriddenType, onOverride }) {
  const effectiveType = overriddenType ?? classification?.type ?? 'personal'
  const confidence = classification?.confidence ?? 0
  const confidenceLabel = getConfidenceLabel(confidence)
  const isOverridden = overriddenType != null && overriddenType !== classification?.type

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
              effectiveType === 'shared'
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {effectiveType}
          </span>
          <span className="text-xs text-slate-500">
            Confidence: {confidenceLabel} ({Math.round(confidence * 100)}%)
          </span>
          {isOverridden && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              Overridden
            </span>
          )}
        </div>
        {classification?.reasoning && (
          <p className="mt-2 text-sm text-slate-600">{classification.reasoning}</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">Override classification</p>
        <div className="flex gap-2">
          {['personal', 'shared'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onOverride(type)}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold capitalize transition ${
                effectiveType === type
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {classification?.retrieved?.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-slate-600">
            Why? Similar past examples ({classification.retrieved.length})
          </summary>
          <ul className="space-y-2 border-t border-slate-100 px-4 py-3">
            {classification.retrieved.map((example, index) => (
              <li key={index} className="text-xs text-slate-600">
                <span className="font-medium capitalize text-slate-800">{example.type}</span>
                {' — '}
                {example.text}
                {example.score != null && (
                  <span className="ml-1 text-slate-400">({Math.round(example.score * 100)}% match)</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {effectiveType === 'shared' && (
        <p className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
          Hive assignment is coming in the next stage — you can still save this as a shared expense for now.
        </p>
      )}
    </div>
  )
}

export default ClassificationPanel
