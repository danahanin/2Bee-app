import { useState } from 'react'
import { useHiveChamber } from '../../context/HiveChamberContext.jsx'
import HiveButton from './primitives/HiveButton.jsx'
import HiveInput from './primitives/HiveInput.jsx'

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
  const { meta } = useHiveChamber()
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
    if (!suggested) nextErrors.push('This hive is already balanced.')
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) nextErrors.push('Amount must be a positive number.')
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
    <div className="hive-modal-overlay" onClick={onClose}>
      <div className="hive-modal hive-modal-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="hive-modal-hex-cap" aria-hidden="true" />
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="hive-modal-zone">{meta.zone}</p>
            <h2 className="hive-modal-title">Start a hive transfer</h2>
            <p className="hive-panel-sub">We&apos;ll open the bank journey after saving details here.</p>
          </div>
          <button type="button" onClick={onClose} className="hive-modal-close" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="hive-tip-banner mb-4">
          Suggested amount to even the jars: <strong>{formatCurrency(suggested?.amount || 0)}</strong>. You can enter less to settle partially.
        </div>

        {errors.length > 0 && (
          <div className="hive-alert hive-alert-error mb-4">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <HiveInput label="Amount" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <HiveInput label="Transfer date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <HiveInput label="Provider ID" type="text" value={providerId} onChange={(e) => setProviderId(e.target.value)} placeholder="leumi" />
          <HiveInput label="PSU ID" type="text" value={psuId} onChange={(e) => setPsuId(e.target.value)} placeholder="National ID" />
          <HiveInput label="Your account type" as="select" value={debtorAccountType} onChange={(e) => setDebtorAccountType(e.target.value)}>
            {ACCOUNT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </HiveInput>
          <HiveInput label="Your account number" type="text" value={debtorAccountNumber} onChange={(e) => setDebtorAccountNumber(e.target.value)} placeholder="IBAN or BBAN" />
          <HiveInput label="Partner account type" as="select" value={creditorAccountType} onChange={(e) => setCreditorAccountType(e.target.value)}>
            {ACCOUNT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </HiveInput>
          <HiveInput label="Partner account number" type="text" value={creditorAccountNumber} onChange={(e) => setCreditorAccountNumber(e.target.value)} placeholder="IBAN or BBAN" />
          <div className="md:col-span-2">
            <HiveInput label="Partner account name" type="text" value={creditorName} onChange={(e) => setCreditorName(e.target.value)} placeholder="Who receives the transfer?" />
          </div>
          <label className="hive-toggle-row md:col-span-2">
            <span className="text-sm">Use Open Finance sandbox for local testing</span>
            <input type="checkbox" checked={includeFakeProviders} onChange={(e) => setIncludeFakeProviders(e.target.checked)} className="hive-checkbox" />
          </label>
          <div className="flex gap-3 pt-2 md:col-span-2">
            <HiveButton type="button" variant="secondary" className="flex-1" onClick={onClose}>{meta.copy.cancel}</HiveButton>
            <HiveButton type="submit" className="flex-1" disabled={isSubmitting}>{isSubmitting ? 'Starting…' : 'Continue to bank'}</HiveButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TransferModal
