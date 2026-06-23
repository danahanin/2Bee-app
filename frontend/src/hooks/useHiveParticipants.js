import { useMemo } from 'react'

export function splitParticipantName(name = '') {
  const parts = name.trim().split(/\s+/)
  return {
    firstName: parts[0] || 'Partner',
    lastName: parts.slice(1).join(' '),
    name,
  }
}

function normalizeParticipants(balance, currentUserId) {
  if (balance?.participants?.length) return balance.participants
  if (balance?.contributions?.length) {
    return balance.contributions.map((c) => ({
      id: c.userId,
      name: c.name,
      avatarUrl: c.avatarUrl,
      paid: c.paid,
      balance: c.remainingNet,
      isCurrentUser: currentUserId ? c.userId === currentUserId : false,
    }))
  }
  return []
}

export function useHiveParticipants(balance, currentUserId) {
  return useMemo(() => {
    const participants = normalizeParticipants(balance, currentUserId)
    const current = participants.find((p) => p.isCurrentUser) || participants[0]
    const partner = participants.find((p) => !p.isCurrentUser) || null

    const toUser = (p) =>
      p
        ? {
            id: p.id,
            ...splitParticipantName(p.name),
            avatarUrl: p.avatarUrl,
            isCurrentUser: p.isCurrentUser,
            paid: p.paid,
            balance: p.balance,
          }
        : null

    return {
      current: toUser(current),
      partner: toUser(partner),
      participants: participants.map(toUser),
    }
  }, [balance, currentUserId])
}

export function findParticipant(participants, userId) {
  if (!userId || !participants?.length) return null
  const match = participants.find((p) => p.id === userId)
  if (!match) return null
  return {
    ...splitParticipantName(match.name),
    avatarUrl: match.avatarUrl,
    id: match.id,
  }
}
