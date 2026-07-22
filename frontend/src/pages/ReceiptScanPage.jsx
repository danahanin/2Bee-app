import ReceiptWizard from '../components/receipt/ReceiptWizard.jsx'

function ReceiptScanPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-8">
      <header>
        <p className="hive-eyebrow">Receipts</p>
        <h1 className="hive-title text-2xl md:text-3xl">Scan a receipt</h1>
        <p className="mt-1 text-sm text-[var(--brown-muted)]">
          Upload a receipt photo, review the details, and confirm before saving an expense.
        </p>
      </header>

      <ReceiptWizard />
    </div>
  )
}

export default ReceiptScanPage
