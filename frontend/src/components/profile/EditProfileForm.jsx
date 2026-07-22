import { useEffect, useMemo, useState } from 'react'

function normalizeValue(value) {
  return String(value || '').trim()
}

function getValidationErrors({ firstName, lastName, bio }) {
  const errors = []
  if (!normalizeValue(firstName)) {
    errors.push('First name is required.')
  } else if (normalizeValue(firstName).length > 50) {
    errors.push('First name must be 50 characters or less.')
  }

  if (!normalizeValue(lastName)) {
    errors.push('Last name is required.')
  } else if (normalizeValue(lastName).length > 50) {
    errors.push('Last name must be 50 characters or less.')
  }

  if (bio.length > 200) {
    errors.push('Bio must be 200 characters or less.')
  }

  return errors
}

function EditProfileForm({ profile, isSaving, onCancel, onSave }) {
  const [firstName, setFirstName] = useState(profile.firstName || '')
  const [lastName, setLastName] = useState(profile.lastName || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [errors, setErrors] = useState([])

  useEffect(() => {
    setFirstName(profile.firstName || '')
    setLastName(profile.lastName || '')
    setBio(profile.bio || '')
    setErrors([])
  }, [profile.bio, profile.firstName, profile.lastName])

  const hasChanges = useMemo(() => {
    return (
      normalizeValue(firstName) !== normalizeValue(profile.firstName) ||
      normalizeValue(lastName) !== normalizeValue(profile.lastName) ||
      bio !== (profile.bio || '')
    )
  }, [bio, firstName, lastName, profile.bio, profile.firstName, profile.lastName])

  async function handleSubmit(event) {
    event.preventDefault()
    const payload = {
      firstName: normalizeValue(firstName),
      lastName: normalizeValue(lastName),
      bio,
    }

    const validationErrors = getValidationErrors(payload)
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors([])

    await onSave(payload)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {errors.length > 0 ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          {errors.map((error) => (
            <p key={error} className="text-sm text-rose-700">
              {error}
            </p>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">First name</span>
          <input
            type="text"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            maxLength={50}
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Last name</span>
          <input
            type="text"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            maxLength={50}
            required
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Bio</span>
        <textarea
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          maxLength={200}
          rows={4}
          className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <span className="mt-1 block text-right text-xs text-slate-500">{bio.length}/200</span>
      </label>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving || !hasChanges}
          className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Save
        </button>
      </div>
    </form>
  )
}

export default EditProfileForm
