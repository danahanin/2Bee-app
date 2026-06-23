import { useRef, useState } from 'react'
import UserAvatar from '../design-system/UserAvatar.jsx'

function BeeSelfGenerator({ user, onGenerate, loading, previewUrl }) {
  const inputRef = useRef(null)
  const [localPreview, setLocalPreview] = useState(null)

  function handleFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setLocalPreview(URL.createObjectURL(file))
    onGenerate(file)
  }

  const displayUrl = previewUrl || localPreview

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--brown-muted)]">
        Upload a photo to create your personalized bee avatar. We blend your likeness with bee-inspired styling.
      </p>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--brown-muted)]">Your photo</p>
          {localPreview ? (
            <img src={localPreview} alt="Upload preview" className="h-24 w-24 rounded-xl object-cover" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-[var(--honey-300)] bg-[var(--honey-50)] text-xs text-[var(--brown-muted)]">
              No photo
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--brown-muted)]">Bee-self result</p>
          {loading ? (
            <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-xl bg-[var(--honey-100)] text-xs text-[var(--brown-muted)]">
              Creating...
            </div>
          ) : displayUrl && previewUrl ? (
            <img src={previewUrl} alt="Bee avatar preview" className="clip-hex h-28 w-24 object-cover" />
          ) : (
            <UserAvatar user={user} size="lg" />
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="hive-btn-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Upload photo & generate bee-self'}
      </button>
    </div>
  )
}

export default BeeSelfGenerator
