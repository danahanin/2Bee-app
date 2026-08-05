function formatSyncTime(timestamp) {
  if (!timestamp) return 'Unknown'
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) return 'Unknown'
  return parsed.toLocaleString('en-IL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function BankAccountCard({ bankAccount, isDisconnecting, onDisconnect, isConnecting, onConnect }) {
  const isConnected = Boolean(bankAccount?.connected || bankAccount?.bankName)

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-slate-900">Bank account</h3>

      {isConnected ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
              BK
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{bankAccount.bankName || 'Connected bank'}</p>
              <p className="text-xs text-slate-500">Last synced: {formatSyncTime(bankAccount.lastSyncedAt)}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDisconnect}
            disabled={isDisconnecting}
            className="mt-4 text-sm font-semibold text-indigo-700 underline-offset-4 transition hover:underline disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-700">No bank account connected.</p>
          {onConnect ? (
            <button
              type="button"
              onClick={onConnect}
              disabled={isConnecting}
              className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isConnecting ? 'Connecting...' : 'Connect bank account'}
            </button>
          ) : null}
        </div>
      )}
    </section>
  )
}

export default BankAccountCard
