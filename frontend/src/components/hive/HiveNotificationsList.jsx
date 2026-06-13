import HivePanel from './primitives/HivePanel.jsx'
import HiveEmptyState from './primitives/HiveEmptyState.jsx'
import { useHiveChamber } from '../../context/HiveChamberContext.jsx'

const TYPE_STYLES = {
  transfer_pending: 'hive-badge-amber',
  transfer_completed: 'hive-badge-green',
  transfer_failed: 'hive-badge-rose',
  transfer_cancelled: 'hive-badge-muted',
}

function HiveNotificationsList({ notifications, isLoading, error }) {
  const { meta } = useHiveChamber()

  if (isLoading) {
    return <div className="hive-skeleton h-40" />
  }

  if (error) {
    return <div className="hive-alert hive-alert-error">{error}</div>
  }

  return (
    <HivePanel className="p-5">
      <div className="mb-4">
        <p className="hive-panel-eyebrow">{meta.copy.notifications}</p>
        <h3 className="hive-panel-title">Hive activity updates</h3>
      </div>

      {notifications.length === 0 ? (
        <HiveEmptyState message="Hive notifications will appear here when transfers change state." icon="📬" />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article key={notification._id} className="hive-list-item">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--chamber-accent-dark)]">{notification.title}</p>
                  <p className="mt-1 text-sm opacity-75">{notification.message}</p>
                </div>
                <span className={`hive-badge ${TYPE_STYLES[notification.type] || 'hive-badge-muted'}`}>
                  {notification.type.replace('transfer_', '').replace('_', ' ')}
                </span>
              </div>
              <p className="mt-3 text-xs opacity-55">
                {new Date(notification.createdAt).toLocaleString('en-IL')}
              </p>
            </article>
          ))}
        </div>
      )}
    </HivePanel>
  )
}

export default HiveNotificationsList
