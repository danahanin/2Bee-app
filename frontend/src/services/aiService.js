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

export async function classifyExpense({ description, amount, category }) {
  const res = await fetch('/ai/classify-expense', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ description, amount, category }),
  });
  if (!res.ok) throw new Error('Failed to classify expense');
  return res.json();
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
