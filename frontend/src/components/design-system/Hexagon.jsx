function Hexagon({ size = 48, variant = 'outline', className = '', children, style = {} }) {
  const variants = {
    outline: 'fill-[var(--wax-surface)] stroke-[var(--honey-400)]',
    filled: 'fill-[var(--honey-400)] stroke-[var(--honey-600)]',
    glow: 'fill-[var(--honey-100)] stroke-[var(--amber-glow)]',
    dark: 'fill-[var(--honey-800)] stroke-[var(--honey-900)]',
  }

  return (
    <svg
      width={size}
      height={size * 1.1547}
      viewBox="0 0 100 115.47"
      className={`${variants[variant] || variants.outline} ${className}`}
      style={style}
      aria-hidden={children ? undefined : true}
    >
      <polygon
        points="50,1 99,28.87 99,86.6 50,114.47 1,86.6 1,28.87"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {children ? (
        <foreignObject x="15" y="25" width="70" height="65">
          <div xmlns="http://www.w3.org/1999/xhtml" className="flex h-full w-full items-center justify-center">
            {children}
          </div>
        </foreignObject>
      ) : null}
    </svg>
  )
}

export default Hexagon
