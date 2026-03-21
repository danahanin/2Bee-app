# AI API Endpoints

Base URL: `/ai`

All endpoints require authentication via `Authorization: Bearer <token>` header.

## Endpoints

### GET /ai/insights

Returns spending insights for the current user.

**Response:**

```json
{
  "data": [
    {
      "id": "ins_001",
      "type": "spending_pattern",
      "title": "Grocery spending increased",
      "description": "Your grocery spending is 15% higher than last month",
      "confidence": 0.87,
      "createdAt": "2026-03-21T10:00:00.000Z"
    }
  ]
}
```

**Insight Types:**
- `spending_pattern` - Patterns detected in spending behavior
- `saving_opportunity` - Potential areas to save money
- `budget_alert` - Alerts when approaching or exceeding budgets
- `unusual_activity` - Unusual spending activity detected

---

### GET /ai/forecast

Returns spending forecast predictions.

**Response:**

```json
{
  "data": [
    {
      "id": "frc_001",
      "period": "monthly",
      "predictedAmount": 2450.00,
      "confidence": 0.78,
      "category": "total",
      "createdAt": "2026-03-21T10:00:00.000Z"
    }
  ]
}
```

**Forecast Periods:**
- `weekly`
- `monthly`
- `quarterly`

---

### GET /ai/recommendations

Returns saving recommendations for the user.

**Response:**

```json
{
  "data": [
    {
      "id": "rec_001",
      "type": "reduce_spending",
      "title": "Reduce takeout orders",
      "description": "Cooking at home 2 more times per week could save you money",
      "potentialSavings": 120.00,
      "priority": 1,
      "createdAt": "2026-03-21T10:00:00.000Z"
    }
  ]
}
```

**Recommendation Types:**
- `reduce_spending` - Suggestions to reduce spending in specific areas
- `increase_savings` - Suggestions to increase savings
- `balance_contribution` - Suggestions for balancing hive contributions
- `set_budget` - Suggestions to create or adjust budgets

---

### POST /ai/classify-expense

Classifies an expense as shared or individual.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | string | Yes | Description of the expense |
| `amount` | number | No | Amount of the expense |

**Example Request:**

```json
{
  "description": "Monthly rent payment",
  "amount": 1500.00
}
```

**Response:**

```json
{
  "data": {
    "label": "shared",
    "confidence": 0.89,
    "category": "housing"
  }
}
```

**Classification Labels:**
- `shared` - Expense should be shared among hive members
- `individual` - Expense is individual

**Detected Categories:**
- `groceries`
- `housing`
- `utilities`
- `telecom`
- `other`

**Error Responses:**

- `400 Bad Request` - Missing or invalid parameters

```json
{
  "error": "description is required"
}
```

```json
{
  "error": "description must be a string"
}
```

```json
{
  "error": "amount must be a number"
}
```

---

### GET /ai/imbalance

Returns hive contribution imbalance analysis.

**Response:**

```json
{
  "data": {
    "id": "imb_001",
    "hiveName": "Home Expenses",
    "contributions": [
      {
        "memberId": "user_001",
        "memberName": "Alice",
        "contributionPercentage": 65,
        "expectedPercentage": 50,
        "deviation": 15
      },
      {
        "memberId": "user_002",
        "memberName": "Bob",
        "contributionPercentage": 35,
        "expectedPercentage": 50,
        "deviation": -15
      }
    ],
    "imbalanceScore": 0.3,
    "suggestion": "Bob could contribute $150 more this month to balance contributions",
    "createdAt": "2026-03-21T10:00:00.000Z"
  }
}
```

**Fields:**
- `imbalanceScore` - Score from 0 (balanced) to 1 (highly imbalanced)
- `deviation` - Positive means over-contributing, negative means under-contributing

---

### GET /ai/goal-suggestions

Returns suggested financial goals based on user spending patterns.

**Response:**

```json
{
  "data": [
    {
      "id": "goal_001",
      "type": "emergency_fund",
      "title": "Build emergency fund",
      "description": "Based on your expenses, aim for 3-6 months of savings",
      "targetAmount": 7500.00,
      "suggestedMonthlyContribution": 250.00,
      "confidence": 0.88,
      "createdAt": "2026-03-21T10:00:00.000Z"
    }
  ]
}
```

**Goal Types:**
- `emergency_fund` - Emergency fund savings goal
- `vacation` - Vacation savings goal
- `large_purchase` - Large purchase savings goal
- `debt_payoff` - Debt payoff goal
- `custom` - Custom user-defined goal

---

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ai/insights` | Get spending insights |
| GET | `/ai/forecast` | Get spending forecast |
| GET | `/ai/recommendations` | Get saving recommendations |
| POST | `/ai/classify-expense` | Classify expense as shared/individual |
| GET | `/ai/imbalance` | Get hive contribution imbalance |
| GET | `/ai/goal-suggestions` | Get goal suggestions |

---

## Confidence Thresholds

All confidence scores range from 0 to 1:
- **High**: >= 0.8
- **Medium**: >= 0.5
- **Low**: >= 0.3

---

## Security Considerations

- All endpoints read auth token from `Authorization: Bearer <token>` header
- Token validation middleware will be added in future PR (auth is currently demo-only)
- Input validation on POST endpoints prevents injection
- No sensitive data exposed in mock responses
