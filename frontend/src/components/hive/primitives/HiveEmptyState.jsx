import { useHiveChamber } from '../../../context/HiveChamberContext.jsx'

function HiveEmptyState({ message, icon = '🍯', className = '' }) {
  const { meta } = useHiveChamber()

  return (
    <div className={`hive-empty-state ${className}`.trim()}>
      <span className="hive-empty-state-icon">{icon}</span>
      <p>{message || meta.copy.empty}</p>
    </div>
  )
}

export default HiveEmptyState
