import { Link } from 'react-router-dom'

function HexButton({
  children,
  onClick,
  to,
  type = 'button',
  variant = 'primary',
  active = false,
  className = '',
  disabled = false,
  size = 'md',
}) {
  const sizes = {
    sm: 'h-14 w-16 text-[10px]',
    md: 'h-16 w-[4.5rem] text-xs',
    lg: 'h-20 w-24 text-sm',
  }

  const variants = {
    primary: active
      ? 'bg-gradient-to-br from-[var(--honey-400)] to-[var(--honey-600)] text-white shadow-[0_0_20px_rgba(245,166,35,0.45)]'
      : 'bg-[var(--wax-surface)] text-[var(--brown-text)] hover:bg-[var(--honey-100)] border border-[rgba(61,41,20,0.12)]',
    ghost: 'bg-transparent text-[var(--brown-muted)] hover:text-[var(--brown-text)]',
  }

  const classes = `clip-hex relative flex flex-col items-center justify-center gap-0.5 font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--honey-400)] disabled:cursor-not-allowed disabled:opacity-50 ${sizes[size]} ${variants[variant]} ${className}`

  if (to) {
    return (
      <Link to={to} className={classes} aria-current={active ? 'page' : undefined}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} className={classes} disabled={disabled} aria-pressed={active}>
      {children}
    </button>
  )
}

export default HexButton
