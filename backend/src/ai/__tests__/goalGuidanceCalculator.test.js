const { calculateGoalMetrics, validateGoalInputs } = require('../goalGuidanceCalculator')

function daysFromNow(days, from = new Date('2026-01-01T12:00:00.000Z')) {
  return new Date(from.getTime() + days * 86400000)
}

const NOW = new Date('2026-01-01T12:00:00.000Z')

describe('validateGoalInputs', () => {
  it('returns no errors for a well-formed goal', () => {
    const errors = validateGoalInputs({ targetAmount: 8000, currentAmount: 2000, deadline: daysFromNow(180, NOW) })
    expect(errors).toHaveLength(0)
  })

  it('flags a missing/NaN targetAmount', () => {
    const errors = validateGoalInputs({ targetAmount: NaN, currentAmount: 0, deadline: daysFromNow(30, NOW) })
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('targetAmount')]))
  })

  it('flags a zero or negative targetAmount', () => {
    const errors = validateGoalInputs({ targetAmount: 0, currentAmount: 0, deadline: daysFromNow(30, NOW) })
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('targetAmount')]))
  })

  it('flags a negative currentAmount', () => {
    const errors = validateGoalInputs({ targetAmount: 100, currentAmount: -5, deadline: daysFromNow(30, NOW) })
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('currentAmount')]))
  })

  it('flags an invalid deadline string', () => {
    const errors = validateGoalInputs({ targetAmount: 100, currentAmount: 0, deadline: 'not-a-date' })
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('deadline')]))
  })

  it('flags a missing deadline', () => {
    const errors = validateGoalInputs({ targetAmount: 100, currentAmount: 0 })
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('deadline')]))
  })
})

describe('calculateGoalMetrics', () => {
  it('computes remaining amount, progress percent and required monthly amount for an in-progress goal', () => {
    // Matches the example in the spec: ₪8,000 target, ₪2,000 saved, 6 months left.
    const metrics = calculateGoalMetrics(
      { targetAmount: 8000, currentAmount: 2000, deadline: daysFromNow(182, NOW) }, // ~6 months
      NOW,
    )

    expect(metrics.valid).toBe(true)
    expect(metrics.status).toBe('on_track')
    expect(metrics.remainingAmount).toBe(6000)
    expect(metrics.progressPercent).toBe(25)
    // ~6 calendar months is not exactly 182 days, so allow a small margin around ₪1,000/mo.
    expect(metrics.requiredMonthlyAmount).toBeGreaterThan(950)
    expect(metrics.requiredMonthlyAmount).toBeLessThan(1050)
  })

  it('marks a goal as completed when currentAmount reaches targetAmount', () => {
    const metrics = calculateGoalMetrics(
      { targetAmount: 1000, currentAmount: 1000, deadline: daysFromNow(30, NOW) },
      NOW,
    )

    expect(metrics.status).toBe('completed')
    expect(metrics.remainingAmount).toBe(0)
    expect(metrics.progressPercent).toBe(100)
    expect(metrics.requiredMonthlyAmount).toBeNull()
    expect(metrics.overfunded).toBe(false)
  })

  it('marks a goal as completed and overfunded when currentAmount exceeds targetAmount', () => {
    const metrics = calculateGoalMetrics(
      { targetAmount: 1000, currentAmount: 1500, deadline: daysFromNow(30, NOW) },
      NOW,
    )

    expect(metrics.status).toBe('completed')
    expect(metrics.overfunded).toBe(true)
    expect(metrics.remainingAmount).toBe(0)
    expect(metrics.progressPercent).toBe(100)
  })

  it('marks a goal as completed even if its deadline has already passed', () => {
    const metrics = calculateGoalMetrics(
      { targetAmount: 1000, currentAmount: 1000, deadline: daysFromNow(-10, NOW) },
      NOW,
    )

    expect(metrics.status).toBe('completed')
  })

  it('marks a goal as expired when the deadline has passed and it is not completed', () => {
    const metrics = calculateGoalMetrics(
      { targetAmount: 1000, currentAmount: 200, deadline: daysFromNow(-1, NOW) },
      NOW,
    )

    expect(metrics.status).toBe('expired')
    expect(metrics.requiredMonthlyAmount).toBeNull()
    expect(metrics.remainingAmount).toBe(800)
  })

  it('marks a goal as due_soon when the deadline is within the threshold and not completed', () => {
    const metrics = calculateGoalMetrics(
      { targetAmount: 1000, currentAmount: 200, deadline: daysFromNow(5, NOW) },
      NOW,
    )

    expect(metrics.status).toBe('due_soon')
    expect(metrics.requiredMonthlyAmount).toBeGreaterThan(0)
    expect(Number.isFinite(metrics.requiredMonthlyAmount)).toBe(true)
  })

  it('never returns an infinite or NaN monthly amount even when the deadline is today', () => {
    const metrics = calculateGoalMetrics(
      { targetAmount: 1000, currentAmount: 200, deadline: daysFromNow(0.1, NOW) },
      NOW,
    )

    expect(Number.isFinite(metrics.requiredMonthlyAmount)).toBe(true)
  })

  it('returns valid:false with errors for invalid or missing values instead of throwing', () => {
    const metrics = calculateGoalMetrics({ targetAmount: null, currentAmount: 0, deadline: 'nope' }, NOW)

    expect(metrics.valid).toBe(false)
    expect(metrics.errors.length).toBeGreaterThan(0)
  })
})
