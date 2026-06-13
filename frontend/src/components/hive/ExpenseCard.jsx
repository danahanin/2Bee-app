import Avatar from '../profile/Avatar.jsx'

const CATEGORY_EMOJI = {
  groceries: '🛒',
  dining: '🍽️',
  transport: '🚗',
  utilities: '💡',
  rent: '🏠',
  entertainment: '🎬',
  health: '💊',
  shopping: '🛍️',
  subscriptions: '📺',
  travel: '✈️',
  education: '📚',
  other: '📌',
}

function HiveIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18l6.26 3.48L12 11.14 5.74 7.66 12 4.18zm-7 5.9l6 3.33v5.96l-6-3.33v-5.96zm8 9.29v-5.96l6-3.33v5.96l-6 3.33z" />
    </svg>
  )
}

function ExpenseCard({ expense, onEdit, onDelete, onConnectToHive, showHiveBadge = true }) {
  const emoji = CATEGORY_EMOJI[expense.category] || '📌'
  const formattedDate = new Date(expense.date).toLocaleDateString('en-IL', {
    day: 'numeric',
    month: 'short',
  })
  const isShared = expense.scope === 'shared' || expense.type === 'shared'
  const paidByLabel = expense.paidBy?.isCurrentUser ? 'you' : expense.paidBy?.name

  return (
    <article className="hive-wax-row group">
      <span className="hive-wax-row-icon">{emoji}</span>

      <div className="hive-wax-row-body">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-[var(--chamber-accent-dark)]">{expense.description}</p>
          {isShared && paidByLabel && expense.paidBy ? (
            <span className="hive-badge hive-badge-amber inline-flex items-center gap-1">
              <Avatar
                avatarUrl={expense.paidBy.avatarUrl}
                firstName={expense.paidBy.firstName}
                lastName={expense.paidBy.lastName}
                name={expense.paidBy.name}
                size="xs"
                showRing={false}
              />
              {paidByLabel}
            </span>
          ) : null}
          {isShared && showHiveBadge ? (
            <span className="hive-badge hive-badge-amber inline-flex items-center gap-1">
              <HiveIcon className="h-3 w-3" />
              Hive
            </span>
          ) : null}
        </div>
        <p className="hive-wax-row-meta">
          {expense.category} · {formattedDate}
          {isShared && paidByLabel ? ` · Paid by ${paidByLabel}` : ''}
        </p>
      </div>

      <div className="hive-wax-row-amount">
        <span className="hive-wax-row-coin">🍯</span>
        <span>₪{expense.amount.toLocaleString('en-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
      </div>

      <div className="hive-wax-row-actions">
        {onConnectToHive && (
          <button
            type="button"
            onClick={() => !isShared && onConnectToHive(expense)}
            disabled={isShared}
            className={`hive-icon-btn ${isShared ? 'hive-icon-btn-muted' : ''}`}
            title={isShared ? 'Already in Hive' : 'Add to Hive'}
          >
            <HiveIcon className="h-4 w-4" />
          </button>
        )}
        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          {onEdit && (
            <button type="button" onClick={() => onEdit(expense)} className="hive-icon-btn" title="Edit">
              ✏️
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={() => onDelete(expense._id)} className="hive-icon-btn hive-icon-btn-danger" title="Delete">
              🗑️
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default ExpenseCard
