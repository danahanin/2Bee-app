const LOGO_BG = '#fbf4ea'
const LOGO_SRC = '/2bee-logo.png'

function BrandMark({ size = 72, className = '' }) {
  const height = size * 1.1547
  const points = '50,1 99,28.87 99,86.6 50,114.47 1,86.6 1,28.87'

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height }} aria-label="2Bee">
      <div className="clip-hex absolute inset-0" style={{ background: LOGO_BG }} />
      <img
        src={LOGO_SRC}
        alt=""
        className="clip-hex absolute inset-0 h-full w-full object-contain p-[12%]"
        style={{ background: LOGO_BG }}
      />
      <svg
        className="pointer-events-none absolute inset-0"
        width={size}
        height={height}
        viewBox="0 0 100 115.47"
        aria-hidden="true"
      >
        <polygon
          points={points}
          fill="none"
          className="stroke-[var(--honey-400)]"
          strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  )
}

export default BrandMark
