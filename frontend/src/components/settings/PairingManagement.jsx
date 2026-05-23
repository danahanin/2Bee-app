import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DisconnectConfirmModal from './DisconnectConfirmModal.jsx'

function PairingManagement({ pairing, isDisconnecting, onDisconnect, onStatusMessage }) {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)

  const isPaired = Boolean(pairing?.paired || pairing?.pairId)

  async function handleConfirmDisconnect() {
    const result = await onDisconnect()
    if (!result.ok) {
      onStatusMessage({ type: 'error', text: result.message || 'Failed to disconnect. Please try again.' })
      return
    }

    setShowModal(false)
    onStatusMessage({ type: 'success', text: 'Disconnected from partner' })
    navigate('/app/profile')
  }

  return (
    <section className="space-y-3">
      <h3 className="text-base font-semibold text-slate-900">Pairing</h3>

      {isPaired ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              PP
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Partner connected</p>
              <p className="text-xs text-slate-500">Connected to your Hive</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-4 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-700">You are not paired with anyone.</p>
          <Link
            to="/app/pairing"
            className="mt-3 inline-flex rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            Find a partner
          </Link>
        </div>
      )}

      {showModal ? (
        <DisconnectConfirmModal
          isDisconnecting={isDisconnecting}
          onCancel={() => setShowModal(false)}
          onConfirm={handleConfirmDisconnect}
        />
      ) : null}
    </section>
  )
}

export default PairingManagement
