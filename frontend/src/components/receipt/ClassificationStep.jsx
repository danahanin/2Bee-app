import ClassificationPanel from './ClassificationPanel.jsx'

function ClassificationStep({ classification, selectedType, onSelectType, errors = [] }) {
  const hasAiSuggestion = Boolean(classification?.type)

  return (
    <div className="space-y-4" role="group" aria-label="Expense classification">
      {errors.length > 0 ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          {errors.map((err) => (
            <p key={err} className="text-sm text-rose-700">
              {err}
            </p>
          ))}
        </div>
      ) : null}

      {hasAiSuggestion ? (
        <ClassificationPanel
          classification={classification}
          overriddenType={selectedType}
          onOverride={onSelectType}
        />
      ) : (
        <div className="space-y-4">
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            No AI classification was included with this scan. Choose whether this expense is personal or shared.
          </p>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700" id="classification-choice-label">
              Classification
            </p>
            <div className="flex gap-2" role="group" aria-labelledby="classification-choice-label">
              {['personal', 'shared'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onSelectType(type)}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold capitalize transition ${
                    selectedType === type
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClassificationStep
