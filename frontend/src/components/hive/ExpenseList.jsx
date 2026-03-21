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

function ExpenseRow({ expense }) {
  const emoji = CATEGORY_EMOJI[expense.category] || '📌'
  const formattedDate = new Date(expense.date).toLocaleDateString('en-IL', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-lg">
        {emoji}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{expense.description}</p>
        <p className="text-xs text-slate-500">
          {expense.category} &middot; {formattedDate}
        </p>
      </div>

      <span className="whitespace-nowrap text-sm font-bold text-slate-900">
        ₪{expense.amount.toLocaleString('en-IL', { minimumFractionDigits: 2 })}
      </span>
    </div>
  )
}

function ExpenseList({ expenses, isLoading, error }) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700">
        {error}
      </div>
    )
  }

  if (!expenses || expenses.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">No expenses found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {expenses.map((expense) => (
        <ExpenseRow key={expense._id} expense={expense} />
      ))}
    </div>
  )
}

export default ExpenseList
