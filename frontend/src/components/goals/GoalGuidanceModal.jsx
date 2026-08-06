function GuidanceSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
      <div className="h-24 w-full animate-pulse rounded bg-slate-100" />
    </div>
  )
}

function GoalGuidanceModal({ goalTitle, isLoading, error, guidance, onClose, onRetry }) {
  return (
    <div className="hive-modal-backdrop" onClick={onClose}>
      <div
        className="hive-modal-panel max-w-full sm:max-w-md"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">AI Guidance{goalTitle ? ` · ${goalTitle}` : ''}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        {isLoading ? (
          <GuidanceSkeleton />
        ) : error ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <p className="text-sm text-rose-700">{error}</p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
            >
              Try again
            </button>
          </div>
        ) : guidance ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">{guidance.summary}</p>
            <p className="text-sm text-slate-700">{guidance.monthlyTargetExplanation}</p>

            {guidance.actionSteps?.length ? (
              <div>
                <p className="mb-1.5 text-sm font-semibold text-slate-900">Suggested steps</p>
                <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
                  {guidance.actionSteps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            ) : null}

            {guidance.alternativeOption ? (
              <div className="rounded-xl bg-[var(--honey-50)] p-3">
                <p className="mb-1 text-sm font-semibold text-slate-900">Alternative</p>
                <p className="text-sm text-slate-700">{guidance.alternativeOption}</p>
              </div>
            ) : null}

            <p className="text-xs italic text-slate-400">
              AI-generated guidance based on the numbers in this Goal — not a guarantee, and not professional
              financial advice.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default GoalGuidanceModal
