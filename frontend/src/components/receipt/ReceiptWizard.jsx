import { useCallback, useMemo, useState } from 'react'
import { EXPENSE_CATEGORIES } from '../../constants/categories.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useHive } from '../../hooks/useHive.js'
import { useReceiptScan } from '../../hooks/useReceiptScan.js'
import ClassificationStep from './ClassificationStep.jsx'
import ConfirmReceiptStep from './ConfirmReceiptStep.jsx'
import HiveSuggestionStep from './HiveSuggestionStep.jsx'
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

function createExpenseGroupSelection(expenseGroupId) {
  if (!expenseGroupId) return null
  return { kind: 'expenseGroup', expenseGroupId: String(expenseGroupId) }
}

function createDefaultHiveSelection(hiveId) {
  if (!hiveId) return null
  return { kind: 'defaultHive', hiveId: String(hiveId) }
}

function initialHiveSelection(suggestion, hiveId) {
  if (suggestion?.expenseGroupId) {
    return createExpenseGroupSelection(suggestion.expenseGroupId)
  }
  return createDefaultHiveSelection(hiveId)
}

function isHiveSelectionReady(selection) {
  if (!selection) return false
  if (selection.kind === 'expenseGroup') return Boolean(selection.expenseGroupId)
  if (selection.kind === 'defaultHive') return Boolean(selection.hiveId)
  return false
}

function resolveExpenseGroupName(selection, suggestion) {
  if (selection?.kind !== 'expenseGroup' || !selection.expenseGroupId) return null
  const selectedId = String(selection.expenseGroupId)
  if (suggestion?.expenseGroupId && String(suggestion.expenseGroupId) === selectedId) {
    return suggestion.groupName || null
  }
  const alternative = (suggestion?.alternatives || []).find(
    (item) => item?.groupId && String(item.groupId) === selectedId,
  )
  return alternative?.name || null
}

function getDestinationSummary(selectedType, hiveSelection, aiHiveSuggestion) {
  if (selectedType === 'personal') {
    return { kind: 'personal', label: 'Personal', message: 'Saved as a personal expense.' }
  }
  if (selectedType !== 'shared') {
    return { kind: null, label: null, message: null }
  }
  if (hiveSelection?.kind === 'defaultHive') {
    return {
      kind: 'defaultHive',
      label: 'General Hive',
      message: 'Saved as a shared expense in General Hive.',
    }
  }
  if (hiveSelection?.kind === 'expenseGroup') {
    const groupName = resolveExpenseGroupName(hiveSelection, aiHiveSuggestion)
    return {
      kind: 'expenseGroup',
      label: groupName || 'Expense group',
      message: groupName
        ? `Saved as a shared expense in ${groupName}.`
        : 'Saved as a shared expense in an ExpenseGroup.',
    }
  }
  return { kind: null, label: null, message: null }
}

function formatAmountLabel(amount, currency) {
  if (amount == null || amount === '') return null
  const value = typeof amount === 'number' ? amount : Number(amount)
  if (Number.isNaN(value)) return String(amount)
  return currency ? `${value} ${currency}` : String(value)
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
  const { pairingStatus } = useAuth()
  const hiveId = pairingStatus?.hiveId || ''
  const { hive, isLoading: hiveLoading, error: hiveLoadError } = useHive(hiveId)
  const { draft, isScanning, isConfirming, error, scan, confirm, reset } = useReceiptScan()
  const [step, setStep] = useState('upload')
  const [skippedHive, setSkippedHive] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [editableExtracted, setEditableExtracted] = useState(null)
  const [fieldConfidence, setFieldConfidence] = useState({})
  const [reviewErrors, setReviewErrors] = useState([])
  const [aiClassification, setAiClassification] = useState(null)
  const [selectedType, setSelectedType] = useState(null)
  const [classificationErrors, setClassificationErrors] = useState([])
  const [aiHiveSuggestion, setAiHiveSuggestion] = useState(null)
  const [hiveSelection, setHiveSelection] = useState(null)
  const [hiveErrors, setHiveErrors] = useState([])
  const [confirmSuccess, setConfirmSuccess] = useState(false)
  const [savedExpenseSummary, setSavedExpenseSummary] = useState(null)
  const [confirmErrors, setConfirmErrors] = useState([])

  const receiptApi = useMemo(
    () => ({ draft, isScanning, isConfirming, error, scan, confirm, reset }),
    [confirm, draft, error, isConfirming, isScanning, reset, scan],
  )

  const isUploadStep = step === 'upload'
  const isReviewStep = step === 'review'
  const isClassificationStep = step === 'classification'
  const isHiveStep = step === 'hive'
  const isCompleteStep = step === 'complete'
  const canGoBack = stepIndex(step) > 0 && !confirmSuccess
  const canGoNext = !isUploadStep && !isCompleteStep && stepIndex(step) < RECEIPT_STEPS.length - 1
  const isBusy = receiptApi.isScanning || receiptApi.isConfirming
  const canScan = Boolean(selectedFile) && !receiptApi.isScanning
  const canContinueFromHive = isHiveSelectionReady(hiveSelection)

  const confirmSummary = useMemo(() => {
    if (!editableExtracted) return null
    const destination = getDestinationSummary(selectedType, hiveSelection, aiHiveSuggestion)
    return {
      vendor: editableExtracted.vendor?.trim() || '',
      amountLabel: formatAmountLabel(editableExtracted.amount, editableExtracted.currency),
      date: editableExtracted.date || '',
      category: editableExtracted.category || '',
      typeLabel:
        selectedType === 'personal' ? 'Personal' : selectedType === 'shared' ? 'Shared' : null,
      showDestination: selectedType === 'shared',
      destination: destination.label,
    }
  }, [aiHiveSuggestion, editableExtracted, hiveSelection, selectedType])

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
        if (selectedType !== 'personal' && selectedType !== 'shared') {
          setClassificationErrors(['Select personal or shared before continuing.'])
          return
        }
        setClassificationErrors([])

        if (selectedType === 'personal' || skipHive) {
          setSkippedHive(true)
          setHiveSelection(null)
          setHiveErrors([])
          setConfirmErrors([])
          setStep('complete')
          return
        }

        setSkippedHive(false)
        setStep('hive')
        return
      }

      if (step === 'hive') {
        if (!isHiveSelectionReady(hiveSelection)) {
          setHiveErrors(['Select a shared destination before continuing.'])
          return
        }
        setHiveErrors([])
        setSkippedHive(false)
        setConfirmErrors([])
        setStep('complete')
        return
      }

      if (!canGoNext) return
      setStep(nextLinearStep(step))
    },
    [canGoNext, editableExtracted, hiveSelection, selectedType, step],
  )

  const goBack = useCallback(() => {
    if (!canGoBack) return

    if (step === 'complete' && skippedHive) {
      setSkippedHive(false)
      setConfirmErrors([])
      setStep('classification')
      return
    }

    if (step === 'complete') {
      setConfirmErrors([])
    }

    if (step === 'review') {
      setReviewErrors([])
    }

    if (step === 'classification') {
      setClassificationErrors([])
    }

    if (step === 'hive') {
      setHiveErrors([])
    }

    setStep(previousLinearStep(step))
  }, [canGoBack, skippedHive, step])

  const handleSelectFile = useCallback((file) => {
    setSelectedFile(file)
  }, [])

  const handleClearFile = useCallback(() => {
    setSelectedFile(null)
  }, [])

  const handleSelectType = useCallback((type) => {
    setSelectedType(type)
    setClassificationErrors([])
    if (type === 'personal') {
      setHiveSelection(null)
      setHiveErrors([])
    } else if (type === 'shared') {
      setHiveSelection(initialHiveSelection(aiHiveSuggestion, hiveId))
    }
  }, [aiHiveSuggestion, hiveId])

  const handleSelectHiveDestination = useCallback((nextSelection) => {
    setHiveSelection(nextSelection)
    setHiveErrors([])
  }, [])

  const buildConfirmPayload = useCallback(() => {
    if (!editableExtracted || (selectedType !== 'personal' && selectedType !== 'shared')) {
      return null
    }

    const vendor = editableExtracted.vendor?.trim() || ''
    const amount = Number(editableExtracted.amount)
    const lineItems = (editableExtracted.lineItems || [])
      .filter((item) => item?.description?.trim())
      .map((item) => ({
        description: item.description.trim(),
        amount: item.amount == null || item.amount === '' ? 0 : Number(item.amount),
      }))

    const expenseGroupId =
      selectedType === 'shared' && hiveSelection?.kind === 'expenseGroup'
        ? hiveSelection.expenseGroupId
        : null

    const sharedHiveId =
      selectedType === 'shared'
        ? hiveSelection?.kind === 'defaultHive'
          ? hiveSelection.hiveId
          : hiveId || null
        : null

    return {
      receiptId: receiptApi.draft?.receiptId || null,
      type: selectedType,
      ...(sharedHiveId ? { hiveId: sharedHiveId } : {}),
      expenseGroupId,
      classifiedBy: !aiClassification?.type
        ? 'user'
        : selectedType !== aiClassification.type
          ? 'user'
          : 'ai',
      extracted: {
        vendor,
        amount,
        category: editableExtracted.category,
        date: editableExtracted.date,
        currency: editableExtracted.currency || null,
        lineItems,
        rawText: editableExtracted.rawText || receiptApi.draft?.ocr?.rawText || '',
      },
      expense: {
        amount,
        category: editableExtracted.category,
        description: vendor,
        date: editableExtracted.date,
      },
    }
  }, [aiClassification, editableExtracted, hiveId, hiveSelection, receiptApi.draft, selectedType])

  const validateConfirmReady = useCallback(() => {
    const errors = []

    if (!receiptApi.draft?.receiptId) {
      errors.push('A scanned receipt is required before saving.')
    }

    errors.push(...validateExtracted(editableExtracted))

    if (selectedType !== 'personal' && selectedType !== 'shared') {
      errors.push('Select personal or shared before saving.')
    }

    if (selectedType === 'shared') {
      if (!hiveSelection) {
        errors.push('Select a shared destination before saving.')
      } else if (hiveSelection.kind === 'expenseGroup' && !hiveSelection.expenseGroupId) {
        errors.push('Select an ExpenseGroup before saving.')
      } else if (hiveSelection.kind === 'defaultHive' && !hiveSelection.hiveId) {
        errors.push('A Hive is required to save to General Hive.')
      } else if (!isHiveSelectionReady(hiveSelection)) {
        errors.push('Select a shared destination before saving.')
      }
    }

    return errors
  }, [editableExtracted, hiveSelection, receiptApi.draft, selectedType])

  const handleConfirmSave = useCallback(async () => {
    if (confirmSuccess || receiptApi.isConfirming) return

    const localErrors = validateConfirmReady()
    if (localErrors.length > 0) {
      setConfirmErrors(localErrors)
      return
    }

    const payload = buildConfirmPayload()
    if (!payload?.receiptId) {
      setConfirmErrors(['A scanned receipt is required before saving.'])
      return
    }

    setConfirmErrors([])
    const result = await receiptApi.confirm(payload)
    if (!result.ok) return

    const destination = getDestinationSummary(selectedType, hiveSelection, aiHiveSuggestion)
    setConfirmSuccess(true)
    setSavedExpenseSummary({
      type: selectedType,
      amount: payload.expense.amount,
      amountLabel: formatAmountLabel(payload.expense.amount, payload.extracted.currency),
      description: payload.expense.description,
      destination: destination.label,
      message: destination.message,
      response: result.data || null,
    })
  }, [
    aiHiveSuggestion,
    buildConfirmPayload,
    confirmSuccess,
    hiveSelection,
    receiptApi,
    selectedType,
    validateConfirmReady,
  ])

  const handleScanReceipt = useCallback(async () => {
    if (!selectedFile || receiptApi.isScanning) return

    const result = await receiptApi.scan(selectedFile)
    if (result.ok && result.draft) {
      const nextClassification = result.draft.classification || null
      const nextHiveSuggestion = result.draft.hiveSuggestion || null
      setEditableExtracted(createEditableExtracted(result.draft))
      setFieldConfidence(result.draft.fieldConfidence || {})
      setReviewErrors([])
      setAiClassification(nextClassification)
      setSelectedType(nextClassification?.type === 'personal' || nextClassification?.type === 'shared'
        ? nextClassification.type
        : null)
      setClassificationErrors([])
      setAiHiveSuggestion(nextHiveSuggestion)
      setHiveSelection(initialHiveSelection(nextHiveSuggestion, hiveId))
      setHiveErrors([])
      setConfirmSuccess(false)
      setSavedExpenseSummary(null)
      setConfirmErrors([])
      setStep('review')
    }
  }, [hiveId, receiptApi, selectedFile])

  const resetWizard = useCallback(() => {
    setStep('upload')
    setSkippedHive(false)
    setSelectedFile(null)
    setEditableExtracted(null)
    setFieldConfidence({})
    setReviewErrors([])
    setAiClassification(null)
    setSelectedType(null)
    setClassificationErrors([])
    setAiHiveSuggestion(null)
    setHiveSelection(null)
    setHiveErrors([])
    setConfirmSuccess(false)
    setSavedExpenseSummary(null)
    setConfirmErrors([])
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
      <ClassificationStep
        classification={aiClassification}
        selectedType={selectedType}
        onSelectType={handleSelectType}
        errors={classificationErrors}
      />
    )
  } else if (step === 'hive') {
    stepPanel = (
      <HiveSuggestionStep
        suggestion={aiHiveSuggestion}
        selection={hiveSelection}
        onSelect={handleSelectHiveDestination}
        hive={hive}
        hiveId={hiveId}
        hiveLoading={hiveLoading}
        hiveError={hiveLoadError}
        errors={hiveErrors}
      />
    )
  } else if (step === 'complete') {
    stepPanel = (
      <ConfirmReceiptStep
        confirmSuccess={confirmSuccess}
        summary={confirmSummary}
        savedExpenseSummary={savedExpenseSummary}
        errors={confirmErrors}
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
        ) : isCompleteStep ? (
          confirmSuccess ? (
            <button
              type="button"
              onClick={resetWizard}
              disabled={isBusy}
              className="rounded-xl bg-[var(--honey-500)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--honey-600)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Scan another receipt
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={receiptApi.isConfirming}
              className="rounded-xl bg-[var(--honey-500)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--honey-600)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {receiptApi.isConfirming ? 'Saving…' : 'Confirm & Save'}
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => goNext()}
            disabled={
              !canGoNext ||
              isBusy ||
              (isReviewStep && !editableExtracted) ||
              (isClassificationStep && selectedType !== 'personal' && selectedType !== 'shared') ||
              (isHiveStep && !canContinueFromHive)
            }
            className="rounded-xl bg-[var(--honey-500)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--honey-600)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={
              isClassificationStep
                ? `Continue as ${selectedType || 'unselected'} expense`
                : isHiveStep
                  ? 'Continue with selected shared destination'
                  : 'Continue'
            }
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
