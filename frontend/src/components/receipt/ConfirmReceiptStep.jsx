function SummaryRow({ label, value }) {
  return (
    <div>
      <span className="font-medium text-slate-700">{label}: </span>
      {value || '—'}
    </div>
  )
}

function ConfirmReceiptStep({
  confirmSuccess,
  summary,
  savedExpenseSummary,
  errors = [],
}) {
  if (confirmSuccess) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-8 text-center">
        <p className="text-sm font-semibold text-emerald-800">Receipt saved</p>
        <p className="mt-2 text-sm text-emerald-700">
          {savedExpenseSummary?.message || 'Your receipt expense was confirmed.'}
        </p>
        {savedExpenseSummary ? (
          <p className="mt-2 text-xs text-emerald-600">
            {[savedExpenseSummary.description, savedExpenseSummary.amountLabel, savedExpenseSummary.destination]
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">Confirm and save</p>

      {errors.length > 0 ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          {errors.map((err) => (
            <p key={err} className="text-sm text-rose-700">
              {err}
            </p>
          ))}
        </div>
      ) : null}

      <dl className="space-y-1 text-sm text-slate-600">
        <SummaryRow label="Vendor" value={summary?.vendor} />
        <SummaryRow label="Amount" value={summary?.amountLabel} />
        <SummaryRow label="Date" value={summary?.date} />
        <SummaryRow label="Category" value={summary?.category} />
        <SummaryRow label="Type" value={summary?.typeLabel} />
        {summary?.showDestination ? (
          <SummaryRow label="Destination" value={summary?.destination} />
        ) : null}
      </dl>

      <p className="text-xs text-slate-500">
        Review the details above, then confirm to save this expense. You can go back to change earlier choices.
      </p>
    </div>
  )
}

export default ConfirmReceiptStep
