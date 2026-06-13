import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import AvatarPicker from './AvatarPicker.jsx'
import HiveInput from '../hive/primitives/HiveInput.jsx'
import HiveButton from '../hive/primitives/HiveButton.jsx'

function normalizeValue(value) {
  return String(value || '').trim()
}

function getValidationErrors({ firstName, lastName, bio }) {
  const errors = []
  if (!normalizeValue(firstName)) errors.push('First name is required.')
  else if (normalizeValue(firstName).length > 50) errors.push('First name must be 50 characters or less.')
  if (!normalizeValue(lastName)) errors.push('Last name is required.')
  else if (normalizeValue(lastName).length > 50) errors.push('Last name must be 50 characters or less.')
  if (bio.length > 200) errors.push('Bio must be 200 characters or less.')
  return errors
}

function EditProfileForm({ profile, isSaving, onCancel, onSave }) {
  const { token } = useAuth()
  const [firstName, setFirstName] = useState(profile.firstName || '')
  const [lastName, setLastName] = useState(profile.lastName || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || null)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    setFirstName(profile.firstName || '')
    setLastName(profile.lastName || '')
    setBio(profile.bio || '')
    setAvatarUrl(profile.avatarUrl || null)
    setErrors([])
  }, [profile.avatarUrl, profile.bio, profile.firstName, profile.lastName])

  const hasChanges = useMemo(() => {
    return (
      normalizeValue(firstName) !== normalizeValue(profile.firstName) ||
      normalizeValue(lastName) !== normalizeValue(profile.lastName) ||
      bio !== (profile.bio || '') ||
      avatarUrl !== (profile.avatarUrl || null)
    )
  }, [avatarUrl, bio, firstName, lastName, profile.avatarUrl, profile.bio, profile.firstName, profile.lastName])

  async function handleSubmit(event) {
    event.preventDefault()
    const payload = { firstName: normalizeValue(firstName), lastName: normalizeValue(lastName), bio, avatarUrl }
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
        <div className="hive-alert hive-alert-error">
          {errors.map((error) => <p key={error}>{error}</p>)}
        </div>
      ) : null}

      <AvatarPicker currentUrl={avatarUrl} firstName={firstName} lastName={lastName} token={token} disabled={isSaving} onChange={setAvatarUrl} />

      <div className="grid gap-4 sm:grid-cols-2">
        <HiveInput label="First name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={50} required />
        <HiveInput label="Last name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={50} required />
      </div>

      <HiveInput label="Bio" as="textarea" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={4} hint={`${bio.length}/200`} />

      <div className="flex gap-3">
        <HiveButton type="button" variant="secondary" className="flex-1" onClick={onCancel}>Cancel</HiveButton>
        <HiveButton type="submit" className="flex-1" disabled={isSaving || !hasChanges}>Save portrait</HiveButton>
      </div>
    </form>
  )
}

export default EditProfileForm
