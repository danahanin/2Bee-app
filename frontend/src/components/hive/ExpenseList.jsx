import ExpenseCard from './ExpenseCard.jsx'

function ExpenseList({ expenses, isLoading, error, onEdit, onDelete, onConnectToHive, highlightId, showHiveBadge = true }) {
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
        <ExpenseCard
          key={expense._id}
          expense={expense}
          onEdit={onEdit}
          onDelete={onDelete}
          onConnectToHive={onConnectToHive}
          isHighlighted={highlightId != null && String(expense._id) === String(highlightId)}
          showHiveBadge={showHiveBadge}
        />
      ))}
    </div>
  )
}

export default ExpenseList
