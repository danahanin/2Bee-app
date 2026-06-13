import { Link } from 'react-router-dom'
import Avatar from '../profile/Avatar.jsx'
import { HiveChamberProvider } from '../../context/HiveChamberContext.jsx'
import { HIVE_COLORS, getChamberTheme } from '../../lib/chamberThemes.js'

function HiveLayout({
  title,
  subtitle,
  chamberName,
  theme = 'hub',
  backTo = '/app',
  children,
  profile,
  partner,
  actions,
}) {
  const meta = getChamberTheme(theme)

  return (
    <HiveChamberProvider theme={theme}>
      <main
        className="hive-page hive-chamber-page"
        style={{
          '--chamber-accent': HIVE_COLORS.accent,
          '--chamber-accent-dark': HIVE_COLORS.accentDark,
          '--chamber-surface': HIVE_COLORS.surface,
          '--chamber-glow': HIVE_COLORS.glow,
        }}
      >
        <div className="hive-chamber-page-bg" aria-hidden="true">
          <div className="hive-chamber-page-hexes" />
          <div className="hive-chamber-page-glow" />
        </div>

        <div className="hive-chamber-page-inner hive-chamber-enter mx-auto max-w-5xl space-y-6 px-4 pb-8 pt-6 md:px-8 md:py-10">
          <header className="hive-chamber-header">
            <div className="hive-chamber-header-glow" aria-hidden="true" />
            <div className="hive-chamber-header-hex" aria-hidden="true" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Link to={backTo} className="hive-chamber-back">
                  {meta.copy.backLabel}
                </Link>
                <div className="flex items-center gap-3">
                  <span className="hive-chamber-emoji">{meta.emoji}</span>
                  <div>
                    <p className="hive-chamber-zone">{chamberName || meta.label}</p>
                    <p className="hive-chamber-sublabel">{meta.zone}</p>
                    <h1 className="hive-chamber-title">{title}</h1>
                    {subtitle ? <p className="hive-chamber-subtitle">{subtitle}</p> : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {(profile || partner) && (
                  <div className="flex items-center -space-x-2">
                    {partner ? (
                      <Avatar
                        avatarUrl={partner.avatarUrl}
                        firstName={partner.firstName}
                        lastName={partner.lastName}
                        size="sm"
                        className="z-0"
                      />
                    ) : null}
                    {profile ? (
                      <Avatar
                        avatarUrl={profile.avatarUrl}
                        firstName={profile.firstName}
                        lastName={profile.lastName}
                        size="sm"
                        className="z-10"
                      />
                    ) : null}
                  </div>
                )}
                {actions}
              </div>
            </div>
          </header>

          <div className="hive-content-frame">{children}</div>
        </div>
      </main>
    </HiveChamberProvider>
  )
}

export default HiveLayout
