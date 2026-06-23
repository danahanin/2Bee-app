function HoneycombBackground() {
  const hexPath =
    'M30,2 L58,17 L58,47 L30,62 L2,47 L2,17 Z'

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-[0.35]" aria-hidden="true">
      <svg
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="honeycomb" width="60" height="104" patternUnits="userSpaceOnUse" patternTransform="scale(1.2)">
            <path d={hexPath} fill="none" stroke="var(--comb-line)" strokeWidth="1.2" />
            <path d={hexPath} fill="none" stroke="var(--comb-line)" strokeWidth="1.2" transform="translate(30,52)" />
            <path d={hexPath} fill="none" stroke="var(--comb-line)" strokeWidth="1.2" transform="translate(0,52)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#honeycomb)" />
      </svg>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(245,166,35,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(201,122,8,0.06) 0%, transparent 45%)',
        }}
      />
    </div>
  )
}

export default HoneycombBackground
