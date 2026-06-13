import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useProfile } from '../hooks/useProfile.js'
import { usePartnerProfile } from '../hooks/usePartnerProfile.js'
import { useHiveBalance } from '../hooks/useHive.js'
import Avatar from '../components/profile/Avatar.jsx'
import HiveIllustration from '../components/hive/HiveIllustration.jsx'
import HiveActionHex from '../components/hive/HiveActionHex.jsx'
import HoneyJar, { HoneyJarGrid } from '../components/hive/primitives/HoneyJar.jsx'
import { HiveChamberProvider } from '../context/HiveChamberContext.jsx'
import { fetchPersonalDashboard, fetchSharedDashboard } from '../services/dashboardService.js'

const ACTION_CARDS = [
  {
    to: '/app/hive',
    label: 'Explore',
    tagline: 'Track shared expenses!',
    theme: 'explore',
    stat: 'Hive ledger',
    emoji: '🍯',
  },
  {
    to: '/app/dashboard/personal',
    label: 'Collect',
    tagline: 'Gather your personal spend!',
    theme: 'collect',
    stat: 'Personal cell',
    emoji: '🐝',
  },
  {
    to: '/app/dashboard/shared',
    label: 'Play',
    tagline: 'Balance together!',
    theme: 'play',
    stat: 'Joint chamber',
    emoji: '🏠',
  },
  {
    to: '/app/insights',
    label: 'Grow',
    tagline: 'Forecasts & savings tips!',
    theme: 'grow',
    stat: 'Smart insights',
    emoji: '✨',
  },
]

const BUZZ_TASKS = [
  { label: 'Check hive balance', to: '/app/hive', done: false },
  { label: 'Review personal spend', to: '/app/dashboard/personal', done: false },
  { label: 'Visit shared chamber', to: '/app/dashboard/shared', done: false },
]

function formatMoney(value) {
  return new Intl.NumberFormat('en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function HiveActionCard({ card, statValue }) {
  return (
    <HiveActionHex
      to={card.to}
      theme={card.theme}
      label={card.label}
      tagline={card.tagline}
      statValue={statValue}
      emoji={card.emoji}
    />
  )
}

function MainPage() {
  const { currentUser, logout, pairingStatus } = useAuth()
  const { profile } = useProfile()
  const { partner } = usePartnerProfile()
  const hiveId = pairingStatus?.hiveId || localStorage.getItem('twobee_hive_id') || ''
  const { balance } = useHiveBalance(hiveId)

  const [dashStats, setDashStats] = useState({ personal: 0, shared: 0, joint: 0 })

  const displayName = profile.firstName || currentUser?.firstName || 'Bee'
  const beeTitle = partner ? `${displayName} & ${partner.firstName}` : displayName

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [personal, shared] = await Promise.all([
          fetchPersonalDashboard('all'),
          fetchSharedDashboard('all'),
        ])
        if (!cancelled) {
          setDashStats({
            personal: personal.totalPersonalSpend || 0,
            shared: personal.totalSharedPaidByYou || 0,
            joint: shared.totalJointSpend || 0,
          })
        }
      } catch {
        /* stats optional on hub */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const hiveHappiness =
    balance?.balanceStatus === 'balanced' ? 95 : balance?.balanceStatus === 'imbalanced' ? 72 : 88
  const honeyStores = dashStats.joint || balance?.totalSharedSpend || 0
  const beeFamily = partner ? 2 : 1

  return (
    <HiveChamberProvider theme="hub">
      <main className="hive-home hive-chamber-page">
        <div className="hive-chamber-page-bg" aria-hidden="true">
          <div className="hive-chamber-page-hexes" />
        </div>
        <div className="hive-home-shell hive-chamber-enter">
        <div className="hive-home-grid">
          {/* Hero — meadow scene */}
          <section className="hive-home-hero">
            <div className="hive-home-hero-sky" aria-hidden="true" />
            <div className="hive-home-hero-meadow" aria-hidden="true" />

            <div className="hive-home-hero-top">
              <div className="hive-home-user-pill">
                <Avatar
                  avatarUrl={profile.avatarUrl}
                  firstName={profile.firstName}
                  lastName={profile.lastName}
                  size="sm"
                  showRing={false}
                />
                <div>
                  <p className="hive-home-user-name">{displayName}</p>
                  <p className="hive-home-user-role">{partner ? 'Hive member' : 'Solo bee'}</p>
                </div>
              </div>

              <button type="button" onClick={logout} className="hive-home-logout">
                Log out
              </button>
            </div>

            <div className="hive-home-hero-title-block">
              <div className="hive-home-logo-row">
                <span className="hive-home-logo-icon">⬡</span>
                <h1 className="hive-home-title">
                  <span className="hive-home-title-main">2BEE</span>
                  <span className="hive-home-title-sub">The Hive</span>
                </h1>
              </div>
              <p className="hive-home-tagline">Track. Share. Grow. Together!</p>
            </div>

            <div className="hive-home-buzz-panel">
              <p className="hive-home-buzz-heading">Today&apos;s Buzz</p>
              <ul className="hive-home-buzz-list">
                {BUZZ_TASKS.map((task) => (
                  <li key={task.label}>
                    <Link to={task.to} className="hive-home-buzz-item">
                      <span className="hive-home-buzz-check">○</span>
                      <span>{task.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Sidebar — Our Hive */}
          <aside className="hive-home-sidebar">
            <h2 className="hive-home-sidebar-title">Our Hive</h2>

            <div className="hive-home-sidebar-visual">
              <HiveIllustration variant="sidebar" fillRatio={hiveHappiness / 100} />
            </div>

            <div className="hive-home-stats">
              <div className="hive-home-jar-hero">
                <HoneyJar
                  size="lg"
                  label="Hive balance"
                  value={`${hiveHappiness}% settled`}
                  fillPercent={hiveHappiness}
                  icon="🍯"
                  sublabel="How balanced your hive is"
                />
              </div>
              <HoneyJarGrid className="hive-home-jar-grid">
                <HoneyJar size="sm" label="Honey stores" value={formatMoney(honeyStores)} fillPercent={85} icon="🍯" />
                <HoneyJar size="sm" label="Your spend" value={formatMoney(dashStats.personal)} fillPercent={65} icon="🐝" />
                <HoneyJar size="sm" label="Bee family" value={String(beeFamily)} fillPercent={beeFamily >= 2 ? 100 : 50} icon="👨‍👩‍👧" />
              </HoneyJarGrid>
            </div>

            <div className="hive-home-tip">
              <span className="hive-home-tip-bee">🐝</span>
              <p>
                {partner
                  ? `The hive thrives when ${displayName} and ${partner.firstName} fly together!`
                  : 'Pair with your partner to unlock the full hive!'}
              </p>
            </div>

            <div className="hive-home-sidebar-links">
              <Link to="/app/profile" className="hive-home-mini-link">
                Profile
              </Link>
              <Link to="/app/settings" className="hive-home-mini-link">
                Settings
              </Link>
            </div>
          </aside>

          {/* Action hex cells */}
          <div className="hive-home-hex-grid">
            <HiveActionCard
              card={ACTION_CARDS[0]}
              statValue={balance ? formatMoney(balance.totalSharedSpend) : 'Open hive'}
            />
            <HiveActionCard card={ACTION_CARDS[1]} statValue={formatMoney(dashStats.personal)} />
            <HiveActionCard card={ACTION_CARDS[2]} statValue={formatMoney(dashStats.joint)} />
            <HiveActionCard card={ACTION_CARDS[3]} statValue="AI tips" />
          </div>
        </div>

        <footer className="hive-home-footer">
          <p>
            Flying as <strong>{beeTitle}</strong>
            {currentUser?.email ? ` · ${currentUser.email}` : ''}
          </p>
        </footer>
      </div>
      </main>
    </HiveChamberProvider>
  )
}

export default MainPage
