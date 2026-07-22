import { useEffect, useRef, useState } from 'react'

/**
 * Measures a chart host and only exposes positive pixel dimensions.
 * Prefer this over Recharts ResponsiveContainer to avoid width/height(-1) warnings.
 */
function useChartSize() {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const update = () => {
      const rect = el.getBoundingClientRect()
      const width = Math.floor(rect.width)
      const height = Math.floor(rect.height)
      setSize((prev) => {
        if (prev.width === width && prev.height === height) return prev
        return { width, height }
      })
    }

    update()

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => update()) : null
    observer?.observe(el)

    window.addEventListener('resize', update)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return [ref, size]
}

export default useChartSize
