import { useState } from 'react'

const ACCOUNT_TYPES = [
  { value: 'iban', label: 'IBAN' },
  { value: 'bban', label: 'BBAN' },
]

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

function TransferModal({ balance, onClose, onSubmit, isSubmitting }) {
  const suggested = balance?.suggestedTransfer

  const [amount, setAmount] = useState(() => (suggested?.amount ? String(suggested.amount) : ''))
  const [providerId, setProviderId] = useState('leumi')
  const [psuId, setPsuId] = useState('')
  const [debtorAccountType, setDebtorAccountType] = useState('iban')
  const [debtorAccountNumber, setDebtorAccountNumber] = useState('')
  const [creditorAccountType, setCreditorAccountType] = useState('iban')
  const [creditorAccountNumber, setCreditorAccountNumber] = useState('')
  const [creditorName, setCreditorName] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [includeFakeProviders, setIncludeFakeProviders] = useState(true)
  const [errors, setErrors] = useState([])

  function validate() {
    const nextErrors = []
    const parsedAmount = parseFloat(amount)
    if (!suggested) {
      nextErrors.push('This hive is already balanced.')
    }
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      nextErrors.push('Amount must be a positive number.')
    }
    if (suggested && parsedAmount > suggested.amount) {
      nextErrors.push(`Amount cannot be higher than ${formatCurrency(suggested.amount)}.`)
    }
    if (!providerId.trim()) nextErrors.push('Provider ID is required.')
    if (!psuId.trim()) nextErrors.push('PSU ID is required.')
    if (!debtorAccountNumber.trim()) nextErrors.push('Your paying account number is required.')
    if (!creditorAccountNumber.trim()) nextErrors.push('Partner account number is required.')
    if (!creditorName.trim()) nextErrors.push('Partner account name is required.')
    if (!date) nextErrors.push('Transfer date is required.')
    return nextErrors
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = validate()
    if (nextErrors.length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors([])
    onSubmit({
      amount: parseFloat(amount),
      providerId: providerId.trim(),
      psuId: psuId.trim(),
      debtorAccountType,
      debtorAccountNumber: debtorAccountNumber.trim(),
      creditorAccountType,
      creditorAccountNumber: creditorAccountNumber.trim(),
      creditorName: creditorName.trim(),
      date,
      includeFakeProviders,
      redirectUrl: `${window.location.origin}/app/hive`,
    })
  }

  return (
    <div className="hive-modal-backdrop" onClick={onClose}>
      <div
        className="hive-modal-panel max-w-full sm:max-w-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Start a transfer</h2>
            <p className="mt-1 text-sm text-slate-500">
              We’ll open the Open Finance journey after saving the transfer details here.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
          Suggested amount to fully even things out: <strong>{formatCurrency(suggested?.amount || 0)}</strong>.
          You can enter a smaller amount if you want to settle only part of it now.
        </div>

        {errors.length > 0 && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
            {errors.map((error) => (
              <p key={error} className="text-sm text-rose-700">
                {error}
              </p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Amount</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Transfer date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Provider ID</span>
            <input
              type="text"
              value={providerId}
              onChange={(event) => setProviderId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="leumi"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">PSU ID</span>
            <input
              type="text"
              value={psuId}
              onChange={(event) => setPsuId(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="National ID used by the bank"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Your account type</span>
            <select
              value={debtorAccountType}
              onChange={(event) => setDebtorAccountType(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              {ACCOUNT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Your account number</span>
            <input
              type="text"
              value={debtorAccountNumber}
              onChange={(event) => setDebtorAccountNumber(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="IBAN or BBAN"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Partner account type</span>
            <select
              value={creditorAccountType}
              onChange={(event) => setCreditorAccountType(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            >
              {ACCOUNT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Partner account number</span>
            <input
              type="text"
              value={creditorAccountNumber}
              onChange={(event) => setCreditorAccountNumber(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="IBAN or BBAN"
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Partner account name</span>
            <input
              type="text"
              value={creditorName}
              onChange={(event) => setCreditorName(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Who should receive the transfer?"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-2">
            <input
              type="checkbox"
              checked={includeFakeProviders}
              onChange={(event) => setIncludeFakeProviders(event.target.checked)}
            />
            Use Open Finance sandbox / fake providers for local testing
          </label>

          <div className="flex gap-3 pt-2 md:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Starting…' : 'Continue to bank'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TransferModal
