function getAuthHeaders() {
  const stored = localStorage.getItem('twobee_auth');
  if (stored) {
    const { token } = JSON.parse(stored);
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

function forecastUrl({ scope, hiveId } = {}) {
  const params = new URLSearchParams();
  if (scope != null && scope !== '') params.set('scope', scope);
  if (hiveId != null && hiveId !== '') params.set('hiveId', hiveId);
  const q = params.toString();
  return q ? `/ai/forecast?${q}` : '/ai/forecast';
}

function imbalanceUrl({ hiveId } = {}) {
  const params = new URLSearchParams();
  if (hiveId != null && hiveId !== '') params.set('hiveId', hiveId);
  const q = params.toString();
  return q ? `/ai/imbalance?${q}` : '/ai/imbalance';
}

export async function fetchInsights() {
  const res = await fetch('/ai/insights', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch insights');
  return res.json();
}

export async function fetchForecast(options) {
  const path = forecastUrl(options ?? {});
  const res = await fetch(path, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch forecast');
  return res.json();
}

export async function fetchRecommendations() {
  const res = await fetch('/ai/recommendations', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch recommendations');
  return res.json();
}

async function parseApiError(res, fallbackMessage) {
  const body = await res.json().catch(() => null);
  return body?.error?.message || fallbackMessage;
}

// Runs the full multi-task classifier (category, personal/shared, hive) for the
// manual-add form. Returns suggestions only — nothing is saved by this call.
export async function classifyExpense({ description, amount, vendor, category, currency, date, lineItems, hiveId }) {
  const res = await fetch('/ai/classify-expense', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ description, amount, vendor, category, currency, date, lineItems, hiveId }),
  });
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to classify expense'));
  const body = await res.json();
  return body.data;
}

// Pending AI suggestions (currently bank-sync expenses) awaiting user confirmation.
export async function fetchNeedsReview() {
  const res = await fetch('/ai/needs-review', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to fetch pending suggestions'));
  const body = await res.json();
  return body.data;
}

// Confirm (empty corrections) or correct a pending suggestion for a single expense.
export async function resolveNeedsReview(expenseId, corrections = {}) {
  const res = await fetch(`/ai/needs-review/${expenseId}/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(corrections),
  });
  if (!res.ok) throw new Error(await parseApiError(res, 'Failed to update expense'));
  const body = await res.json();
  return body.data;
}

export async function fetchImbalance(options) {
  const path = imbalanceUrl(options ?? {});
  const res = await fetch(path, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch imbalance');
  return res.json();
}

export async function fetchGoalSuggestions() {
  const res = await fetch('/ai/goal-suggestions', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch goal suggestions');
  return res.json();
}
