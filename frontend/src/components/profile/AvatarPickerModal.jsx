import { useState } from 'react'
import BuiltinAvatarGallery from './BuiltinAvatarGallery.jsx'
import UserAvatar from '../design-system/UserAvatar.jsx'
import { useAvatar } from '../../hooks/useAvatar.js'

const TABS = [
  { id: 'gallery', label: 'Gallery' },
  { id: 'upload', label: 'Upload' },
]

function AvatarPickerModal({ user, onClose, onSaved }) {
  const [tab, setTab] = useState('gallery')
  const [selected, setSelected] = useState({ avatarUrl: user?.avatarUrl, avatarType: user?.avatarType })
  const { loading, error, previewUrl, uploadAvatar, setAvatar } = useAvatar({
    onSaved: (updated) => {
      onSaved?.(updated)
      onClose()
    },
  })

  async function handleSave() {
    if (!selected.avatarUrl) return
    await setAvatar({ avatarUrl: selected.avatarUrl, avatarType: selected.avatarType || 'gallery' })
  }

  async function handleUpload(file) {
    const result = await uploadAvatar(file)
    setSelected({ avatarUrl: result.avatarUrl, avatarType: 'upload' })
  }

  const previewUser = {
    ...user,
    avatarUrl: previewUrl || selected.avatarUrl || user?.avatarUrl,
  }

  return (
    <div className="hive-modal-backdrop" onClick={onClose}>
      <div className="hive-modal-panel hive-card max-w-full sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="hive-title text-lg">Choose profile image</h2>
          <button type="button" onClick={onClose} className="text-sm text-[var(--brown-muted)] hover:text-[var(--brown-text)]">
            Close
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center gap-2">
          <UserAvatar user={previewUser} size="xl" />
          <p className="text-xs text-[var(--brown-muted)]">Preview</p>
        </div>

        <div className="mb-4 flex gap-1 rounded-xl bg-[var(--honey-50)] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                tab === t.id
                  ? 'bg-white text-[var(--honey-800)] shadow-sm'
                  : 'text-[var(--brown-muted)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'gallery' && (
          <BuiltinAvatarGallery
            selectedUrl={selected.avatarUrl}
            onSelect={(avatar) => setSelected({ avatarUrl: avatar.url, avatarType: 'gallery' })}
          />
        )}

        {tab === 'upload' && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--brown-muted)]">Upload a personal photo from your device.</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
              className="block w-full text-sm text-[var(--brown-muted)]"
            />
          </div>
        )}

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[rgba(61,41,20,0.12)] px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !selected.avatarUrl}
            className="hive-btn-primary flex-1 rounded-xl px-4 py-2 text-sm disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save profile image'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AvatarPickerModal
