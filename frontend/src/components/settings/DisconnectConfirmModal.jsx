function DisconnectConfirmModal({ isDisconnecting, onCancel, onConfirm }) {
  return (
    <div className="hive-modal-backdrop" onClick={onCancel}>
      <div className="hive-modal-panel max-w-full sm:max-w-md" onClick={(event) => event.stopPropagation()}>
        <h3 className="text-lg font-semibold text-slate-900">Are you sure you want to disconnect?</h3>
        <p className="mt-2 text-sm text-slate-600">
          This will remove your partner from your Hive. Your shared expense history will be archived.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDisconnecting}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDisconnecting}
            className="flex-1 rounded-xl border border-red-300 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DisconnectConfirmModal
