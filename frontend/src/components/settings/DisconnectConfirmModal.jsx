import HiveButton from '../hive/primitives/HiveButton.jsx'

function DisconnectConfirmModal({ isDisconnecting, onCancel, onConfirm }) {
  return (
    <div className="hive-modal-overlay" onClick={onCancel}>
      <div className="hive-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="hive-modal-hex-cap" aria-hidden="true" />
        <h3 className="hive-modal-title">Leave your hive mate?</h3>
        <p className="hive-panel-sub mt-2">
          This removes your partner from the hive. Shared history will be archived.
        </p>
        <div className="mt-6 flex gap-3">
          <HiveButton type="button" variant="secondary" className="flex-1" onClick={onCancel} disabled={isDisconnecting}>
            Stay together
          </HiveButton>
          <HiveButton type="button" className="flex-1 !bg-rose-600 !text-white" onClick={onConfirm} disabled={isDisconnecting}>
            {isDisconnecting ? 'Leaving…' : 'Disconnect'}
          </HiveButton>
        </div>
      </div>
    </div>
  )
}

export default DisconnectConfirmModal
