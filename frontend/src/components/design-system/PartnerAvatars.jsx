import UserAvatar from './UserAvatar.jsx'

function PartnerAvatars({ user, partner, onTransfer }) {
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'You'
  const partnerName = partner ? `${partner.firstName} ${partner.lastName}`.trim() : 'Partner'

  return (
    <div className="flex items-center justify-center gap-4 md:gap-6">
      <div className="flex flex-col items-center gap-1.5">
        <UserAvatar user={user} size="lg" />
        <span className="max-w-[5rem] truncate text-xs font-medium text-[var(--brown-muted)]">{userName}</span>
        <span className="rounded-full bg-[var(--honey-600)] px-2 py-0.5 text-[9px] font-bold uppercase text-white">You</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-1">
          <div className="h-px w-6 bg-[var(--honey-300)] md:w-10" />
          <div className="clip-hex flex h-8 w-9 items-center justify-center bg-[var(--honey-200)] text-[var(--honey-800)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l2.4 4.8L20 8l-4 3.5L17 17l-5-2.8L7 17l1-5.5L4 8l5.6-1.2L12 2z" />
            </svg>
          </div>
          <div className="h-px w-6 bg-[var(--honey-300)] md:w-10" />
        </div>
        {onTransfer ? (
          <button
            type="button"
            onClick={onTransfer}
            className="hive-btn-primary clip-hex px-4 py-2 text-xs font-semibold"
          >
            Transfer
          </button>
        ) : null}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <UserAvatar user={partner || { firstName: 'Partner', lastName: '' }} size="lg" />
        <span className="max-w-[5rem] truncate text-xs font-medium text-[var(--brown-muted)]">{partnerName}</span>
      </div>
    </div>
  )
}

export default PartnerAvatars
