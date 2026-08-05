jest.mock('../expenseTotals', () => ({
  getPersonalCategoryMonthTotals: jest.fn(),
  getSharedCategoryMonthTotals: jest.fn(),
}))

const { getPersonalCategoryMonthTotals, getSharedCategoryMonthTotals } = require('../expenseTotals')
const { getGoalSpendingContext, MAX_CATEGORIES } = require('../goalGuidanceSpending')

describe('getGoalSpendingContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('queries personal totals (never shared) for a personal goal', async () => {
    getPersonalCategoryMonthTotals.mockResolvedValue({})

    await getGoalSpendingContext({ userId: 'user_a', hiveId: null })

    expect(getPersonalCategoryMonthTotals).toHaveBeenCalledWith('user_a', expect.objectContaining({ monthCount: 3 }))
    expect(getSharedCategoryMonthTotals).not.toHaveBeenCalled()
  })

  it('queries shared totals (never personal) for a shared/Hive goal', async () => {
    getSharedCategoryMonthTotals.mockResolvedValue({})

    await getGoalSpendingContext({ userId: 'user_a', hiveId: 'hive_1' })

    expect(getSharedCategoryMonthTotals).toHaveBeenCalledWith('hive_1', expect.objectContaining({ monthCount: 3 }))
    expect(getPersonalCategoryMonthTotals).not.toHaveBeenCalled()
  })

  it('averages only over months that actually had spend in that category', async () => {
    getPersonalCategoryMonthTotals.mockResolvedValue({
      dining: [0, 100, 300], // averages to 200 over the 2 non-zero months, not ~133
    })

    const result = await getGoalSpendingContext({ userId: 'user_a', hiveId: null })

    expect(result).toEqual([{ category: 'dining', avgMonthlyAmount: 200 }])
  })

  it('sorts categories by average spend, highest first, capped at MAX_CATEGORIES', async () => {
    getPersonalCategoryMonthTotals.mockResolvedValue({
      groceries: [400, 400, 400],
      dining: [50, 50, 50],
      shopping: [900, 900, 900],
      travel: [10, 10, 10],
      transport: [20, 20, 20],
    })

    const result = await getGoalSpendingContext({ userId: 'user_a', hiveId: null })

    expect(result).toHaveLength(MAX_CATEGORIES)
    expect(result.map((entry) => entry.category)).toEqual(['shopping', 'groceries', 'dining'])
    expect(result[0]).toEqual({ category: 'shopping', avgMonthlyAmount: 900 })
  })

  it('filters out near-zero/rounding-dust categories', async () => {
    getPersonalCategoryMonthTotals.mockResolvedValue({
      dining: [0.2, 0.4, 0],
      groceries: [300, 300, 300],
    })

    const result = await getGoalSpendingContext({ userId: 'user_a', hiveId: null })

    expect(result.map((entry) => entry.category)).toEqual(['groceries'])
  })

  it('returns an empty array when there is no spending history at all', async () => {
    getPersonalCategoryMonthTotals.mockResolvedValue({})

    const result = await getGoalSpendingContext({ userId: 'user_a', hiveId: null })

    expect(result).toEqual([])
  })
})
