const TABS = [
  { key: 'shared', label: 'Our Hive' },
  { key: 'personal', label: 'My Expenses' },
]

function ViewToggle({ active, onChange }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
            active === tab.key
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default ViewToggle
