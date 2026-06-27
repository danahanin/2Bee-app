import { useEffect, useMemo, useState } from 'react'
import { useHiveBalance } from './useHive.js'
import { useHiveParticipants } from './useHiveParticipants.js'
import { fetchPersonalDashboard, fetchSharedDashboard } from '../services/dashboardService.js'
import * as aiService from '../services/aiService.js'

export function useAIPageData(hiveId, currentUserId) {
  const { balance, isLoading: balanceLoading } = useHiveBalance(hiveId)
  const { current, partner } = useHiveParticipants(balance, currentUserId)

  const [personalDashboard, setPersonalDashboard] = useState(null)
  const [sharedDashboard, setSharedDashboard] = useState(null)
  const [insights, setInsights] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [imbalance, setImbalance] = useState(null)
  const [forecast, setForecast] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [personal, shared, insightsRes, recsRes, imbalanceRes, forecastRes] = await Promise.all([
          fetchPersonalDashboard().catch(() => null),
          fetchSharedDashboard().catch(() => null),
          aiService.fetchInsights().catch(() => ({ data: [] })),
          aiService.fetchRecommendations().catch(() => ({ data: [] })),
          aiService.fetchImbalance(hiveId ? { hiveId } : {}).catch(() => ({ data: null })),
          aiService.fetchForecast({ scope: 'shared', hiveId: hiveId || undefined }).catch(() => ({ data: [] })),
        ])

        if (cancelled) return
        setPersonalDashboard(personal)
        setSharedDashboard(shared)
        setInsights(Array.isArray(insightsRes?.data) ? insightsRes.data : [])
        setRecommendations(Array.isArray(recsRes?.data) ? recsRes.data : [])
        setImbalance(imbalanceRes?.data ?? null)
        setForecast(Array.isArray(forecastRes?.data) ? forecastRes.data : [])
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load AI data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [hiveId])

  const alerts = useMemo(() => {
    const alertTypes = new Set(['budget_warning', 'spike', 'forecast_exceeded', 'overspend'])
    const fromInsights = insights.filter((item) => alertTypes.has(item.type))
    if (imbalance?.isImbalanced) {
      fromInsights.unshift({
        id: 'hive-imbalance',
        type: 'imbalance',
        title: 'Hive balance uneven',
        description: imbalance.message || 'One partner has paid more than their share.',
        severity: 'high',
      })
    }
    return fromInsights
  }, [insights, imbalance])

  const overviewSummary = useMemo(() => {
    if (imbalance?.message) return imbalance.message
    const top = insights[0]
    if (top?.description) return top.description
    if (balance?.balanceStatus === 'balanced') return 'Your hive is balanced and spending looks steady this month.'
    return 'Review your shared and personal spending to stay on track.'
  }, [imbalance, insights, balance])

  return {
    balance,
    balanceLoading,
    current,
    partner,
    personalDashboard,
    sharedDashboard,
    insights,
    recommendations,
    imbalance,
    forecast,
    alerts,
    overviewSummary,
    loading,
    error,
  }
}
