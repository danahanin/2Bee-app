import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import HiveButton from '../hive/primitives/HiveButton.jsx'
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
      {isPaired ? (
        <div className="hive-list-item">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg">🐝</span>
            <div>
              <p className="font-semibold text-[var(--chamber-accent-dark)]">Hive mate connected</p>
              <p className="text-xs opacity-70">Flying together in the hive</p>
            </div>
          </div>
          <HiveButton type="button" variant="ghost" className="mt-4 text-rose-700" onClick={() => setShowModal(true)}>
            Leave hive mate
          </HiveButton>
        </div>
      ) : (
        <div className="hive-list-item">
          <p className="text-sm opacity-80">No hive mate yet — pair to unlock the full hive.</p>
          <Link to="/app/pairing" className="hive-btn hive-btn-primary mt-3 inline-block text-center no-underline">
            Find a hive mate
          </Link>
        </div>
      )}

      {showModal ? (
        <DisconnectConfirmModal isDisconnecting={isDisconnecting} onCancel={() => setShowModal(false)} onConfirm={handleConfirmDisconnect} />
      ) : null}
    </section>
  )
}

export default PairingManagement
