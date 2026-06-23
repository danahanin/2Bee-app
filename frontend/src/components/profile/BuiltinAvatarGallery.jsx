import { BUILTIN_AVATARS } from '../../data/builtinAvatars.js'
import UserAvatar from '../design-system/UserAvatar.jsx'

function BuiltinAvatarGallery({ selectedUrl, onSelect }) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-4">
      {BUILTIN_AVATARS.map((avatar) => (
        <button
          key={avatar.id}
          type="button"
          onClick={() => onSelect(avatar)}
          className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition hover:border-[var(--honey-400)] hover:bg-[var(--honey-50)] ${
            selectedUrl === avatar.url
              ? 'border-[var(--honey-500)] bg-[var(--honey-50)] ring-2 ring-[var(--honey-300)]'
              : 'border-[rgba(61,41,20,0.1)] bg-white'
          }`}
        >
          <UserAvatar user={{ avatarUrl: avatar.url, firstName: 'B', lastName: 'ee' }} size="md" />
          <span className="text-[10px] font-medium text-[var(--brown-muted)]">{avatar.label}</span>
        </button>
      ))}
    </div>
  )
}

export default BuiltinAvatarGallery
