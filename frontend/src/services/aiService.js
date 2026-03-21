function getAuthHeaders() {
  const stored = localStorage.getItem('twobee_auth');
  if (stored) {
    const { token } = JSON.parse(stored);
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function fetchInsights() {
  const res = await fetch('/ai/insights', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch insights');
  return res.json();
}

export async function fetchForecast() {
  const res = await fetch('/ai/forecast', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch forecast');
  return res.json();
}

export async function fetchRecommendations() {
  const res = await fetch('/ai/recommendations', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch recommendations');
  return res.json();
}

export async function classifyExpense({ description, amount }) {
  const res = await fetch('/ai/classify-expense', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ description, amount }),
  });
  if (!res.ok) throw new Error('Failed to classify expense');
  return res.json();
}

export async function fetchImbalance() {
  const res = await fetch('/ai/imbalance', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch imbalance');
  return res.json();
}

export async function fetchGoalSuggestions() {
  const res = await fetch('/ai/goal-suggestions', { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to fetch goal suggestions');
  return res.json();
}
