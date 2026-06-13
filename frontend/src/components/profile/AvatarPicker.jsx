import { useCallback, useEffect, useRef, useState } from 'react'
import { apiUrl } from '../../lib/api.js'
import Avatar from './Avatar.jsx'

function AvatarPicker({ currentUrl, firstName, lastName, token, onChange, disabled }) {
  const [defaults, setDefaults] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function loadDefaults() {
      try {
        const res = await fetch(apiUrl('/api/avatars/default'))
        if (!res.ok) throw new Error('Failed to load default avatars')
        const data = await res.json()
        if (!cancelled) setDefaults(data.avatars || [])
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadDefaults()
    return () => {
      cancelled = true
    }
  }, [])

  const handleUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0]
      if (!file || !token) return

      setUploading(true)
      setError(null)
      try {
        const formData = new FormData()
        formData.append('avatar', file)

        const res = await fetch(apiUrl('/api/profile/avatar'), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.error?.message || 'Upload failed')
        }

        onChange(data.avatarUrl)
      } catch (err) {
        setError(err.message)
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [onChange, token],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Avatar avatarUrl={currentUrl} firstName={firstName} lastName={lastName} size="xl" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-950">Your hive portrait</p>
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleUpload} />
          <p className="text-xs text-amber-800/70">JPEG, PNG, WebP or GIF · max 2 MB</p>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800/80">Choose a hive bee</p>
        {loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="hex-clip h-14 animate-pulse bg-amber-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {defaults.map((item) => {
              const selected = currentUrl === item.url
              return (
                <button
                  key={item._id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(item.url)}
                  className={`hex-clip relative h-14 overflow-hidden transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                    selected ? 'ring-2 ring-amber-600 ring-offset-2' : ''
                  }`}
                  title={item.label}
                >
                  <img src={item.url} alt={item.label} className="h-full w-full object-cover" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AvatarPicker
