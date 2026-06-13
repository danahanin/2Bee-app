import { Link } from 'react-router-dom'
import { getChamberTheme } from '../../lib/chamberThemes.js'

function HiveActionHex({ to, theme, label, tagline, statValue, emoji }) {
  const meta = getChamberTheme(theme)

  return (
    <Link to={to} className="hive-action-hex" title={meta.narrative}>
      <span className="hive-action-hex-badge">{label}</span>
      <div className="hive-action-hex-scene">
        <span className="hive-action-hex-emoji">{emoji}</span>
      </div>
      <div className="hive-action-hex-footer">
        <p className="hive-action-hex-tagline">{tagline}</p>
        {statValue ? <span className="hive-action-hex-stat">{statValue}</span> : null}
      </div>
    </Link>
  )
}

export default HiveActionHex
