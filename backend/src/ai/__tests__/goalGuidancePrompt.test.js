jest.mock('../llm', () => ({
  generateJSON: jest.fn(),
}))

const { generateJSON } = require('../llm')
const { generateGoalGuidance, buildGoalGuidancePrompt } = require('../goalGuidancePrompt')

const baseGoal = {
  title: 'Vacation fund',
  category: 'travel',
  targetAmount: 8000,
  currentAmount: 2000,
  deadline: '2026-07-01T00:00:00.000Z',
}

const baseMetrics = {
  valid: true,
  status: 'on_track',
  overfunded: false,
  remainingAmount: 6000,
  progressPercent: 25,
  daysRemaining: 180,
  monthsRemaining: 6,
  requiredMonthlyAmount: 1000,
}

// Amounts already converted to the requesting user's display currency — the prompt
// builder itself never does currency math, it only formats/labels what it's given.
const ilsDisplayAmounts = {
  targetAmount: 8000,
  currentAmount: 2000,
  remainingAmount: 6000,
  requiredMonthlyAmount: 1000,
}

const usdDisplayAmounts = {
  targetAmount: 2160,
  currentAmount: 540,
  remainingAmount: 1620,
  requiredMonthlyAmount: 270,
}

const validResponse = {
  summary: 'You have already completed 25% of your goal.',
  monthlyTargetExplanation: 'Reaching the remaining amount within the time left would take about ₪1,000 per month.',
  actionSteps: ['Decide on a fixed monthly amount.', 'Review progress at the end of each month.'],
  alternativeOption: 'Extending the deadline by two months would reduce the required monthly amount.',
}

describe('buildGoalGuidancePrompt', () => {
  it('embeds only the goal fields and computed metrics, never raw expenses or partner data', () => {
    const prompt = buildGoalGuidancePrompt({
      goal: baseGoal,
      metrics: baseMetrics,
      displayCurrency: 'ILS',
      displayAmounts: ilsDisplayAmounts,
    })

    expect(prompt).toContain('"title": "Vacation fund"')
    expect(prompt).toContain('"requiredMonthlyAmount": 1000')
    expect(prompt).toContain('"status": "on_track"')
    expect(prompt).not.toMatch(/partner/i)
    expect(prompt).not.toMatch(/transaction/i)
    expect(prompt).not.toMatch(/bank/i)
  })

  it('defaults to ILS with the ₪ symbol when no display currency is given', () => {
    const prompt = buildGoalGuidancePrompt({ goal: baseGoal, metrics: baseMetrics, displayAmounts: ilsDisplayAmounts })

    expect(prompt).toContain('"currency": "ILS"')
    expect(prompt).toContain('"currencySymbol": "₪"')
    expect(prompt).not.toContain('"currencySymbol": "$"')
  })

  it('uses the $ symbol and converted amounts when the display currency is USD', () => {
    const prompt = buildGoalGuidancePrompt({
      goal: baseGoal,
      metrics: baseMetrics,
      displayCurrency: 'USD',
      displayAmounts: usdDisplayAmounts,
    })

    expect(prompt).toContain('"currency": "USD"')
    expect(prompt).toContain('"currencySymbol": "$"')
    expect(prompt).toContain('"targetAmount": 2160')
    expect(prompt).toContain('"requiredMonthlyAmount": 270')
    expect(prompt).not.toContain('"targetAmount": 8000')
  })

  it('falls back to ILS for an unrecognized currency code instead of guessing', () => {
    const prompt = buildGoalGuidancePrompt({
      goal: baseGoal,
      metrics: baseMetrics,
      displayCurrency: 'XYZ',
      displayAmounts: ilsDisplayAmounts,
    })

    expect(prompt).toContain('"currency": "ILS"')
    expect(prompt).toContain('"currencySymbol": "₪"')
  })

  it('tells the LLM to keep advice generic when there is no spending history', () => {
    const prompt = buildGoalGuidancePrompt({
      goal: baseGoal,
      metrics: baseMetrics,
      displayCurrency: 'ILS',
      displayAmounts: ilsDisplayAmounts,
      topSpendingCategories: [],
    })

    expect(prompt).toContain('"topSpendingCategories": []')
    expect(prompt).toMatch(/keep every step generic/i)
  })

  it('includes real spending categories/amounts and instructs the LLM to use only those', () => {
    const topSpendingCategories = [
      { category: 'dining', avgMonthlyAmount: 450 },
      { category: 'shopping', avgMonthlyAmount: 300 },
    ]
    const prompt = buildGoalGuidancePrompt({
      goal: baseGoal,
      metrics: baseMetrics,
      displayCurrency: 'ILS',
      displayAmounts: ilsDisplayAmounts,
      topSpendingCategories,
    })

    expect(prompt).toContain('"category": "dining"')
    expect(prompt).toContain('"avgMonthlyAmount": 450')
    expect(prompt).toContain('"category": "shopping"')
    expect(prompt).toMatch(/Never invent a category, merchant, or amount that isn't listed/)
  })

  it('defaults to an empty topSpendingCategories list when none is provided', () => {
    const prompt = buildGoalGuidancePrompt({
      goal: baseGoal,
      metrics: baseMetrics,
      displayCurrency: 'ILS',
      displayAmounts: ilsDisplayAmounts,
    })

    expect(prompt).toContain('"topSpendingCategories": []')
  })
})

describe('generateGoalGuidance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the parsed guidance when the LLM responds with valid structured JSON', async () => {
    generateJSON.mockResolvedValue(validResponse)

    const result = await generateGoalGuidance({
      goal: baseGoal,
      metrics: baseMetrics,
      displayCurrency: 'ILS',
      displayAmounts: ilsDisplayAmounts,
    })

    expect(result).toEqual(validResponse)
  })

  it('throws when the LLM response is missing a required field', async () => {
    generateJSON.mockResolvedValue({
      summary: 'Looking good.',
      actionSteps: ['Step one', 'Step two'],
      alternativeOption: 'Extend the deadline.',
      // monthlyTargetExplanation missing
    })

    await expect(
      generateGoalGuidance({ goal: baseGoal, metrics: baseMetrics, displayCurrency: 'ILS', displayAmounts: ilsDisplayAmounts }),
    ).rejects.toThrow(/Invalid goal guidance response/)
  })

  it('throws when actionSteps has fewer than 2 entries', async () => {
    generateJSON.mockResolvedValue({ ...validResponse, actionSteps: ['Only one step'] })

    await expect(
      generateGoalGuidance({ goal: baseGoal, metrics: baseMetrics, displayCurrency: 'ILS', displayAmounts: ilsDisplayAmounts }),
    ).rejects.toThrow(/Invalid goal guidance response/)
  })

  it('throws when actionSteps has more than 3 entries', async () => {
    generateJSON.mockResolvedValue({
      ...validResponse,
      actionSteps: ['One', 'Two', 'Three', 'Four'],
    })

    await expect(
      generateGoalGuidance({ goal: baseGoal, metrics: baseMetrics, displayCurrency: 'ILS', displayAmounts: ilsDisplayAmounts }),
    ).rejects.toThrow(/Invalid goal guidance response/)
  })

  it('propagates the error when the LLM call itself fails or is unavailable', async () => {
    generateJSON.mockRejectedValue(new Error('LLM unavailable'))

    await expect(
      generateGoalGuidance({ goal: baseGoal, metrics: baseMetrics, displayCurrency: 'ILS', displayAmounts: ilsDisplayAmounts }),
    ).rejects.toThrow('LLM unavailable')
  })
})
