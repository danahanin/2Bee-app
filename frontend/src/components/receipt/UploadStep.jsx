import { useEffect, useId, useMemo, useRef, useState } from 'react'

function isImageFile(file) {
  return Boolean(file?.type?.startsWith('image/'))
}

function UploadStep({ selectedFile, onSelectFile, onClearFile, disabled = false }) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [localError, setLocalError] = useState(null)

  const previewUrl = useMemo(() => {
    if (!selectedFile) return null
    return URL.createObjectURL(selectedFile)
  }, [selectedFile])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  function openFilePicker() {
    if (disabled) return
    inputRef.current?.click()
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!isImageFile(file)) {
      setLocalError('Please choose an image file.')
      return
    }

    setLocalError(null)
    onSelectFile(file)
  }

  function handleClear() {
    if (disabled) return
    setLocalError(null)
    onClearFile()
  }

  function handleReplace() {
    if (disabled) return
    setLocalError(null)
    openFilePicker()
  }

  return (
    <div className="space-y-4">
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        onChange={handleFileChange}
      />

      {!selectedFile ? (
        <label
          htmlFor={inputId}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-10 text-center transition hover:border-[var(--honey-400)] hover:bg-[var(--honey-50)] ${
            disabled ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <span className="text-sm font-semibold text-slate-700">Take a photo or choose an image</span>
          <span className="text-xs text-slate-400">JPEG, PNG, WEBP, or HEIC receipt photos work best</span>
        </label>
      ) : (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Selected receipt preview: ${selectedFile.name}`}
                className="mx-auto max-h-64 w-full object-contain"
              />
            ) : null}
          </div>
          <p className="truncate text-sm font-medium text-slate-700" title={selectedFile.name}>
            {selectedFile.name}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReplace}
              disabled={disabled}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Replace image
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear image
            </button>
          </div>
        </div>
      )}

      {localError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {localError}
        </div>
      ) : null}
    </div>
  )
}

export default UploadStep
