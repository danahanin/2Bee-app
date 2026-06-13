function HiveButton({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  const variantClass =
    variant === 'secondary'
      ? 'hive-btn-secondary'
      : variant === 'ghost'
        ? 'hive-btn-ghost'
        : 'hive-btn-primary'

  return (
    <button type={type} className={`hive-btn ${variantClass} ${className}`.trim()} {...props}>
      {children}
    </button>
  )
}

export default HiveButton
