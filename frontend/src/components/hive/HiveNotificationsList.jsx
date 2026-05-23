const TYPE_STYLES = {
  transfer_pending: 'bg-amber-50 text-amber-700',
  transfer_completed: 'bg-emerald-50 text-emerald-700',
  transfer_failed: 'bg-rose-50 text-rose-700',
  transfer_cancelled: 'bg-slate-100 text-slate-700',
}

function HiveNotificationsList({ notifications, isLoading, error }) {
  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-white shadow-sm" />
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        {error}
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Notifications</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">Hive activity updates</h3>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          Hive notifications will appear here when transfers change state.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article key={notification._id} className="rounded-xl border border-slate-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    TYPE_STYLES[notification.type] || 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {notification.type.replace('transfer_', '').replace('_', ' ')}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {new Date(notification.createdAt).toLocaleString('en-IL')}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default HiveNotificationsList
