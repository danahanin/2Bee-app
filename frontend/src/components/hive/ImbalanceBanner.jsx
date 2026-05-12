function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

function ImbalanceBanner({ balance, currentUserId, isLoading, error, onSettle }) {
  if (isLoading) {
    return <div className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {error}
      </div>
    )
  }

  if (!balance) return null

  const currentContribution = balance.contributions?.find((item) => item.userId === currentUserId) || null
  const canSettle = balance.suggestedTransfer?.fromUserId === currentUserId
  const remaining = formatCurrency(balance.remainingImbalance)

  let title = 'Your hive is balanced'
  let description = 'You and your partner are even for now.'

  if (balance.balanceStatus === 'imbalanced' && currentContribution) {
    if (currentContribution.remainingNet > 0) {
      title = `You've covered ${formatCurrency(currentContribution.remainingNet)} more so far`
      description = `A transfer of ${remaining} would bring things back into balance.`
    } else {
      title = `Your partner has covered ${formatCurrency(Math.abs(currentContribution.remainingNet))} more so far`
      description = canSettle
        ? `A transfer of ${remaining} would gently even things out.`
        : 'We are waiting for the next transfer step to even things out.'
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">Hive balance</p>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="max-w-2xl text-sm text-slate-600">{description}</p>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Shared spend: {formatCurrency(balance.totalSharedSpend)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              Each share: {formatCurrency(balance.equalShare)}
            </span>
            {balance.completedTransfersTotal > 0 && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                Transferred already: {formatCurrency(balance.completedTransfersTotal)}
              </span>
            )}
          </div>
        </div>

        {canSettle && balance.balanceStatus === 'imbalanced' && (
          <button
            type="button"
            onClick={onSettle}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Start transfer
          </button>
        )}
      </div>
    </section>
  )
}

export default ImbalanceBanner
