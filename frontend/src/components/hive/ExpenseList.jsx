import ExpenseCard from './ExpenseCard.jsx'
import HivePanel from './primitives/HivePanel.jsx'
import HiveEmptyState from './primitives/HiveEmptyState.jsx'

function ExpenseList({ expenses, isLoading, error, onEdit, onDelete, onConnectToHive, showHiveBadge = true, title = 'Wax ledger' }) {
  if (isLoading) {
    return (
      <HivePanel className="p-6">
        <div className="flex justify-center py-8">
          <div className="hive-spinner" aria-label="Loading" />
        </div>
      </HivePanel>
    )
  }

  if (error) {
    return <div className="hive-alert hive-alert-error">{error}</div>
  }

  if (!expenses || expenses.length === 0) {
    return (
      <HivePanel className="p-5">
        <p className="hive-panel-eyebrow">Wax ledger</p>
        <h3 className="hive-panel-title">{title}</h3>
        <HiveEmptyState message="No nectar logged yet — your jar is empty!" icon="🍯" className="mt-4" />
      </HivePanel>
    )
  }

  return (
    <HivePanel className="overflow-hidden p-0">
      <div className="hive-wax-ledger-header">
        <p className="hive-panel-eyebrow">Wax ledger</p>
        <h3 className="hive-panel-title">{title}</h3>
        <p className="hive-panel-sub">{expenses.length} {expenses.length === 1 ? 'entry' : 'entries'} in the hive</p>
      </div>
      <div className="hive-wax-ledger">
        {expenses.map((expense) => (
          <ExpenseCard
            key={expense._id}
            expense={expense}
            onEdit={onEdit}
            onDelete={onDelete}
            onConnectToHive={onConnectToHive}
            showHiveBadge={showHiveBadge}
          />
        ))}
      </div>
    </HivePanel>
  )
}

export default ExpenseList
