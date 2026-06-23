import { useNavigate } from 'react-router-dom'
import HexButton from '../design-system/HexButton.jsx'

const ACTIONS = [
  {
    id: 'settle',
    label: 'Settle balance',
    icon: '💸',
    to: '/app/hive?action=settle',
  },
  {
    id: 'review',
    label: 'Review expenses',
    icon: '🔍',
    to: '/app/expenses?tab=expenses',
  },
  {
    id: 'budget',
    label: 'Set budgets',
    icon: '📊',
    to: '/app/profile?section=categories',
  },
  {
    id: 'report',
    label: 'Monthly report',
    icon: '📋',
    scrollTo: 'monthly-report',
  },
  {
    id: 'reminder',
    label: 'Payment reminder',
    icon: '🔔',
    to: '/app/hive?tab=balance',
  },
]

function SuggestedActions() {
  const navigate = useNavigate()

  function handleAction(action) {
    if (action.scrollTo) {
      document.getElementById(action.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (action.to) navigate(action.to)
  }

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {ACTIONS.map((action) => (
        <HexButton key={action.id} size="md" onClick={() => handleAction(action)}>
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </HexButton>
      ))}
    </div>
  )
}

export default SuggestedActions
