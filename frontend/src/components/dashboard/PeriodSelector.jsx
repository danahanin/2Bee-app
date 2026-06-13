import { PERIOD_OPTIONS } from '../../lib/dashboardUtils.js'

function PeriodSelector({ value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hive-panel-eyebrow">Period</span>
      <div className="hive-view-toggle hive-view-toggle-compact">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.key)}
            className={`hive-view-tab hive-view-tab-compact ${value === option.key ? 'hive-view-tab-active' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default PeriodSelector
