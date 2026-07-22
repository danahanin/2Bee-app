import { useCallback, useMemo, useState } from 'react'
import { useReceiptScan } from '../../hooks/useReceiptScan.js'

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

  const receiptApi = useMemo(
    () => ({ draft, isScanning, isConfirming, error, scan, confirm, reset }),
    [confirm, draft, error, isConfirming, isScanning, reset, scan],
  )

  const canGoBack = stepIndex(step) > 0
  const canGoNext = stepIndex(step) < RECEIPT_STEPS.length - 1
  const isBusy = receiptApi.isScanning || receiptApi.isConfirming

  const goNext = useCallback(
    ({ skipHive = false } = {}) => {
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
    [canGoNext, step],
  )

  const goBack = useCallback(() => {
    if (!canGoBack) return

    if (step === 'complete' && skippedHive) {
      setSkippedHive(false)
      setStep('classification')
      return
    }

    setStep(previousLinearStep(step))
  }, [canGoBack, skippedHive, step])

  const resetWizard = useCallback(() => {
    setStep('upload')
    setSkippedHive(false)
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
      <PlaceholderPanel
        title="Upload step"
        description="Receipt image upload will plug in here and call the shared scan action."
      />
    )
  } else if (step === 'review') {
    stepPanel = (
      <PlaceholderPanel
        title="Review step"
        description={
          receiptApi.draft
            ? 'Draft is ready for the extracted-fields review panel.'
            : 'Extracted receipt fields will appear here after a successful scan.'
        }
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
        <button
          type="button"
          onClick={() => goNext()}
          disabled={!canGoNext || isBusy}
          className="rounded-xl bg-[var(--honey-500)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--honey-600)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
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
