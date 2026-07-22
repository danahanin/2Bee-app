import { useEffect, useRef } from 'react'
import UserAvatar from '../design-system/UserAvatar.jsx'

const CATEGORY_EMOJI = {
  groceries: '\u{1F6D2}',
  dining: '\u{1F37D}\uFE0F',
  transport: '\u{1F697}',
  utilities: '\u{1F4A1}',
  rent: '\u{1F3E0}',
  entertainment: '\u{1F3AC}',
  health: '\u{1F48A}',
  shopping: '\u{1F6CD}\uFE0F',
  subscriptions: '\u{1F4FA}',
  travel: '\u2708\uFE0F',
  education: '\u{1F4DA}',
  other: '\u{1F4CC}',
}

function HiveIcon({ className }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18l6.26 3.48L12 11.14 5.74 7.66 12 4.18zm-7 5.9l6 3.33v5.96l-6-3.33v-5.96zm8 9.29v-5.96l6-3.33v5.96l-6 3.33z"/>
    </svg>
  )
}

function formatAmount(amount) {
  const value = Number(amount) || 0
  const digits = Number.isInteger(value) ? 0 : 2
  return `\u20AA${value.toLocaleString('en-IL', {
    minimumFractionDigits: digits,
    maximumFractionDigits: 2,
  })}`
}

function ExpenseCard({ expense, onEdit, onDelete, onConnectToHive, isHighlighted = false, showHiveBadge = true }) {
  const cardRef = useRef(null)
  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [isHighlighted])
  const emoji = CATEGORY_EMOJI[expense.category] || '\u{1F4CC}'
  const formattedDate = new Date(expense.date).toLocaleDateString('en-IL', {
    day: 'numeric',
    month: 'short',
  })
  const isShared = expense.scope === 'shared' || expense.type === 'shared'
  const paidByLabel = expense.paidBy?.isCurrentUser ? 'You' : expense.paidBy?.name
  const hasActions = Boolean(onEdit || onDelete || onConnectToHive)

  return (
    <div
      ref={cardRef}
      className={`rounded-xl border bg-white px-2.5 py-2.5 shadow-sm transition hover:shadow-md sm:px-3 sm:py-3 ${
        isHighlighted
          ? 'border-[var(--honey-400)] ring-2 ring-[var(--honey-300)]'
          : 'border-[rgba(61,41,20,0.1)]'
      }`}
    >
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-x-2.5 sm:gap-x-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--honey-50)] text-base">
          {emoji}
        </span>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--brown-text)]">
            {expense.description}
            {isShared && showHiveBadge ? (
              <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--honey-50)] px-1.5 py-0.5 align-middle text-[10px] font-semibold text-[var(--honey-800)]">
                <HiveIcon className="h-3 w-3" />
                Hive
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--brown-muted)]">
            {isShared && expense.paidBy ? (
              <span className="mr-1.5 inline-flex align-middle">
                <UserAvatar
                  user={{
                    name: expense.paidBy.name,
                    avatarUrl: expense.paidBy.avatarUrl,
                    firstName: expense.paidBy.name?.split(' ')[0],
                    lastName: expense.paidBy.name?.split(' ').slice(1).join(' '),
                  }}
                  size="xs"
                  showHexFrame={false}
                />
              </span>
            ) : null}
            <span className="capitalize">{expense.category}</span>
            {' · '}
            {formattedDate}
            {isShared && paidByLabel ? ` · ${paidByLabel}` : ''}
          </p>
        </div>

        <span className="pt-0.5 text-right text-sm font-bold tabular-nums whitespace-nowrap text-[var(--brown-text)]">
          {formatAmount(expense.amount)}
        </span>
      </div>

      {hasActions ? (
        <div className="mt-2 flex items-center gap-1 border-t border-[rgba(61,41,20,0.06)] pt-2 sm:justify-end">
          {onConnectToHive && (
            <button
              type="button"
              onClick={() => !isShared && onConnectToHive(expense)}
              disabled={isShared}
              className={`flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition ${
                isShared
                  ? 'cursor-default text-amber-400'
                  : 'text-slate-500 hover:bg-amber-50 hover:text-amber-600'
              }`}
              title={isShared ? 'Already in Hive' : 'Add to Hive'}
              aria-label={isShared ? 'Already in Hive' : 'Add to Hive'}
            >
              <HiveIcon className="h-4 w-4" />
              <span className="sm:hidden">{isShared ? 'In Hive' : 'To Hive'}</span>
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(expense)}
              className="flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
              title="Edit"
              aria-label="Edit expense"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
              <span className="sm:hidden">Edit</span>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(expense._id)}
              className="flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
              title="Delete"
              aria-label="Delete expense"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022 1.005 11.36A2.75 2.75 0 007.77 20h4.46a2.75 2.75 0 002.751-2.689l1.005-11.36.149.022a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 01.7.797l-.5 6a.75.75 0 01-1.497-.124l.5-6a.75.75 0 01.797-.672zm3.638.672a.75.75 0 10-1.497.124l.5 6a.75.75 0 101.497-.124l-.5-6z" clipRule="evenodd" />
              </svg>
              <span className="sm:hidden">Delete</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default ExpenseCard
