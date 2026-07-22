import { useCallback, useMemo, useState } from 'react'
import { EXPENSE_CATEGORIES } from '../../constants/categories.js'
import { useReceiptScan } from '../../hooks/useReceiptScan.js'
import ReviewExtractedStep from './ReviewExtractedStep.jsx'
import UploadStep from './UploadStep.jsx'

const RECEIPT_STEPS = ['upload', 'review', 'classification', 'hive', 'complete']

const STEP_LABELS = {
  upload: 'Upload',
  review: 'Review',
  classification: 'Classify',
  hive: 'Hive',
  complete: 'Confirm',
}

function stepIndex(step) {
  return RECEIPT_STEPS.indexOf(step)
}

function nextLinearStep(step) {
  const index = stepIndex(step)
  if (index < 0 || index >= RECEIPT_STEPS.length - 1) return step
  return RECEIPT_STEPS[index + 1]
}

function previousLinearStep(step) {
  const index = stepIndex(step)
  if (index <= 0) return step
  return RECEIPT_STEPS[index - 1]
}

function toDateInputValue(isoDate) {
  if (!isoDate) return ''
  return String(isoDate).split('T')[0]
}

function createEditableExtracted(draft) {
  const extracted = draft?.extracted || {}
  return {
    vendor: extracted.vendor ?? '',
    amount: extracted.amount ?? null,
    currency: extracted.currency ?? null,
    date: toDateInputValue(extracted.date),
    category: extracted.category ?? '',
    lineItems: Array.isArray(extracted.lineItems)
      ? extracted.lineItems.map((item) => ({
          description: item?.description ?? '',
          amount: item?.amount ?? null,
        }))
      : [],
    rawText: extracted.rawText ?? draft?.ocr?.rawText ?? '',
  }
}

function validateExtracted(extracted) {
  const errors = []
  const vendor = extracted?.vendor?.trim?.() ?? ''
  const amount = typeof extracted?.amount === 'number' ? extracted.amount : Number(extracted?.amount)
  const date = extracted?.date ?? ''
  const category = extracted?.category ?? ''

  if (!vendor) {
    errors.push('Vendor is required')
  }
  if (extracted?.amount == null || Number.isNaN(amount) || amount <= 0) {
    errors.push('Amount must be a positive number')
  }
  if (!date || Number.isNaN(Date.parse(date))) {
    errors.push('Please enter a valid date')
  }
  if (!EXPENSE_CATEGORIES.includes(category)) {
    errors.push('Please select a valid category')
  }
  return errors
}

function Stepper({ currentStep, skippedHive }) {
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {RECEIPT_STEPS.map((stepId, index) => {
        const current = stepIndex(currentStep)
        const isSkipped = stepId === 'hive' && skippedHive && current > stepIndex('classification')
        const isActive = currentStep === stepId
        const isDone = !isSkipped && current > index

        return (
          <div
            key={stepId}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
              isActive
                ? 'border-[var(--honey-300)] bg-[var(--honey-50)] text-[var(--honey-800)]'
                : isDone
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : isSkipped
                    ? 'border-slate-100 bg-slate-50 text-slate-400 line-through'
                    : 'border-slate-200 bg-white text-slate-500'
            }`}
          >
            <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs shadow-sm">
              {index + 1}
            </span>
            {STEP_LABELS[stepId]}
          </div>
        )
      })}
    </div>
  )
}

function PlaceholderPanel({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </div>
  )
}

function ReceiptWizard() {
  const { draft, isScanning, isConfirming, error, scan, confirm, reset } = useReceiptScan()
  const [step, setStep] = useState('upload')
  const [skippedHive, setSkippedHive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [editableExtracted, setEditableExtracted] = useState(null)
  const [fieldConfidence, setFieldConfidence] = useState({})
  const [reviewErrors, setReviewErrors] = useState([])

  const receiptApi = useMemo(
    () => ({ draft, isScanning, isConfirming, error, scan, confirm, reset }),
    [confirm, draft, error, isConfirming, isScanning, reset, scan],
  )

  const isUploadStep = step === 'upload'
  const isReviewStep = step === 'review'
  const canGoBack = stepIndex(step) > 0
  const canGoNext = !isUploadStep && stepIndex(step) < RECEIPT_STEPS.length - 1
  const isBusy = receiptApi.isScanning || receiptApi.isConfirming
  const canScan = Boolean(selectedFile) && !receiptApi.isScanning

  const updateExtractedField = useCallback((field, value) => {
    setEditableExtracted((prev) => {
      if (!prev) return prev
      return { ...prev, [field]: value }
    })
  }, [])

  const updateLineItem = useCallback((index, field, value) => {
    setEditableExtracted((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        lineItems: prev.lineItems.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [field]: value } : item,
        ),
      }
    })
  }, [])

  const addLineItem = useCallback(() => {
    setEditableExtracted((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        lineItems: [...prev.lineItems, { description: '', amount: null }],
      }
    })
  }, [])

  const removeLineItem = useCallback((index) => {
    setEditableExtracted((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        lineItems: prev.lineItems.filter((_, itemIndex) => itemIndex !== index),
      }
    })
  }, [])

  const goNext = useCallback(
    ({ skipHive = false } = {}) => {
      if (step === 'upload') return

      if (step === 'review') {
        const errors = validateExtracted(editableExtracted)
        if (errors.length > 0) {
          setReviewErrors(errors)
          return
        }
        setReviewErrors([])
        setStep('classification')
        return
      }

      if (step === 'classification') {
        if (skipHive) {
          setSkippedHive(true)
          setStep('complete')
          return
        }
        setSkippedHive(false)
        setStep('hive')
        return
      }

      if (step === 'hive') {
        setSkippedHive(false)
        setStep('complete')
        return
      }

      if (!canGoNext) return
      setStep(nextLinearStep(step))
    },
    [canGoNext, editableExtracted, step],
  )

  const goBack = useCallback(() => {
    if (!canGoBack) return

    if (step === 'complete' && skippedHive) {
      setSkippedHive(false)
      setStep('classification')
      return
    }

    if (step === 'review') {
      setReviewErrors([])
    }

    setStep(previousLinearStep(step))
  }, [canGoBack, skippedHive, step])

  const handleSelectFile = useCallback((file) => {
    setSelectedFile(file)
  }, [])

  const handleClearFile = useCallback(() => {
    setSelectedFile(null)
  }, [])

  const handleScanReceipt = useCallback(async () => {
    if (!selectedFile || receiptApi.isScanning) return

    const result = await receiptApi.scan(selectedFile)
    if (result.ok && result.draft) {
      setEditableExtracted(createEditableExtracted(result.draft))
      setFieldConfidence(result.draft.fieldConfidence || {})
      setReviewErrors([])
      setStep('review')
    }
  }, [receiptApi, selectedFile])

  const resetWizard = useCallback(() => {
    setStep('upload')
    setSkippedHive(false)
    setSelectedFile(null)
    setEditableExtracted(null)
    setFieldConfidence({})
    setReviewErrors([])
    receiptApi.reset()
  }, [receiptApi])

  const statusMessage = useMemo(() => {
    if (receiptApi.isScanning) return 'Scanning receipt…'
    if (receiptApi.isConfirming) return 'Saving expense…'
    return null
  }, [receiptApi.isConfirming, receiptApi.isScanning])

  let stepPanel = null
  if (step === 'upload') {
    stepPanel = (
      <UploadStep
        selectedFile={selectedFile}
        onSelectFile={handleSelectFile}
        onClearFile={handleClearFile}
        disabled={receiptApi.isScanning}
      />
    )
  } else if (step === 'review') {
    stepPanel = editableExtracted ? (
      <ReviewExtractedStep
        extracted={editableExtracted}
        fieldConfidence={fieldConfidence}
        ocrRawText={receiptApi.draft?.ocr?.rawText || ''}
        onUpdateField={updateExtractedField}
        onUpdateLineItem={updateLineItem}
        onAddLineItem={addLineItem}
        onRemoveLineItem={removeLineItem}
        errors={reviewErrors}
      />
    ) : (
      <PlaceholderPanel
        title="Review step"
        description="Extracted receipt fields will appear here after a successful scan."
      />
    )
  } else if (step === 'classification') {
    stepPanel = (
      <PlaceholderPanel
        title="Classification step"
        description="Personal vs shared classification will appear here. Later: goNext({ skipHive: true }) for personal."
      />
    )
  } else if (step === 'hive') {
    stepPanel = (
      <PlaceholderPanel
        title="Hive suggestion step"
        description="Shared-expense hive suggestions will appear here. Personal expenses skip this step."
      />
    )
  } else if (step === 'complete') {
    stepPanel = (
      <PlaceholderPanel
        title="Confirm step"
        description="Final confirm and save will use the shared confirm action. Nothing is submitted automatically."
      />
    )
  }

  return (
    <section className="hive-card space-y-5 overflow-hidden p-5">
      <Stepper currentStep={step} skippedHive={skippedHive} />

      {receiptApi.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {receiptApi.error}
        </div>
      ) : null}

      {statusMessage ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="mb-2 text-sm font-medium text-slate-700">{statusMessage}</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--honey-400)]" />
          </div>
        </div>
      ) : null}

      {stepPanel}

      <div className="flex flex-wrap gap-3 pt-1">
        <button
          type="button"
          onClick={goBack}
          disabled={!canGoBack || isBusy}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back
        </button>
        {isUploadStep ? (
          <button
            type="button"
            onClick={handleScanReceipt}
            disabled={!canScan}
            className="rounded-xl bg-[var(--honey-500)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--honey-600)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {receiptApi.isScanning ? 'Scanning…' : 'Scan receipt'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goNext()}
            disabled={!canGoNext || isBusy || (isReviewStep && !editableExtracted)}
            className="rounded-xl bg-[var(--honey-500)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--honey-600)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </button>
        )}
        <button
          type="button"
          onClick={resetWizard}
          disabled={isBusy}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset
        </button>
      </div>
    </section>
  )
}

export default ReceiptWizard
