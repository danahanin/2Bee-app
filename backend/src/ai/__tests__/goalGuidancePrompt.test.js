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

const validResponse = {
  summary: 'You have already completed 25% of your goal.',
  monthlyTargetExplanation: 'Reaching the remaining amount within the time left would take about ₪1,000 per month.',
  actionSteps: ['Decide on a fixed monthly amount.', 'Review progress at the end of each month.'],
  alternativeOption: 'Extending the deadline by two months would reduce the required monthly amount.',
}

describe('buildGoalGuidancePrompt', () => {
  it('embeds only the goal fields and computed metrics, never raw expenses or partner data', () => {
    const prompt = buildGoalGuidancePrompt({ goal: baseGoal, metrics: baseMetrics })

    expect(prompt).toContain('"title": "Vacation fund"')
    expect(prompt).toContain('"requiredMonthlyAmount": 1000')
    expect(prompt).toContain('"status": "on_track"')
    expect(prompt).not.toMatch(/partner/i)
    expect(prompt).not.toMatch(/transaction/i)
    expect(prompt).not.toMatch(/bank/i)
  })
})

describe('generateGoalGuidance', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns the parsed guidance when the LLM responds with valid structured JSON', async () => {
    generateJSON.mockResolvedValue(validResponse)

    const result = await generateGoalGuidance({ goal: baseGoal, metrics: baseMetrics })

    expect(result).toEqual(validResponse)
  })

  it('throws when the LLM response is missing a required field', async () => {
    generateJSON.mockResolvedValue({
      summary: 'Looking good.',
      actionSteps: ['Step one', 'Step two'],
      alternativeOption: 'Extend the deadline.',
      // monthlyTargetExplanation missing
    })

    await expect(generateGoalGuidance({ goal: baseGoal, metrics: baseMetrics })).rejects.toThrow(
      /Invalid goal guidance response/,
    )
  })

  it('throws when actionSteps has fewer than 2 entries', async () => {
    generateJSON.mockResolvedValue({ ...validResponse, actionSteps: ['Only one step'] })

    await expect(generateGoalGuidance({ goal: baseGoal, metrics: baseMetrics })).rejects.toThrow(
      /Invalid goal guidance response/,
    )
  })

  it('throws when actionSteps has more than 3 entries', async () => {
    generateJSON.mockResolvedValue({
      ...validResponse,
      actionSteps: ['One', 'Two', 'Three', 'Four'],
    })

    await expect(generateGoalGuidance({ goal: baseGoal, metrics: baseMetrics })).rejects.toThrow(
      /Invalid goal guidance response/,
    )
  })

  it('propagates the error when the LLM call itself fails or is unavailable', async () => {
    generateJSON.mockRejectedValue(new Error('LLM unavailable'))

    await expect(generateGoalGuidance({ goal: baseGoal, metrics: baseMetrics })).rejects.toThrow('LLM unavailable')
  })
})
