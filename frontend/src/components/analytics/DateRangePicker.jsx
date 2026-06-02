import { PRESETS } from '../../utils/dateRangePresets.js'

function DateRangePicker({ presetId, from, to, onPresetChange, onCustomRangeChange }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date range</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPresetChange(preset.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  presetId === preset.id
                    ? 'bg-indigo-600 text-white'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm text-slate-600">
            From
            <input
              type="date"
              value={from ? from.slice(0, 10) : ''}
              onChange={(event) =>
                onCustomRangeChange({
                  from: event.target.value ? new Date(`${event.target.value}T00:00:00.000Z`).toISOString() : '',
                  to,
                })
              }
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"
            />
          </label>
          <label className="text-sm text-slate-600">
            To
            <input
              type="date"
              value={to ? to.slice(0, 10) : ''}
              onChange={(event) =>
                onCustomRangeChange({
                  from,
                  to: event.target.value ? new Date(`${event.target.value}T23:59:59.999Z`).toISOString() : '',
                })
              }
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-slate-900"
            />
          </label>
        </div>
      </div>
    </section>
  )
}

export default DateRangePicker
