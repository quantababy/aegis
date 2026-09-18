/**
 * AEGIS API Client
 */
const BASE_URL = window.location.origin;

export const AegisAPI = {
  async getTelemetry() {
    const res = await fetch(`${BASE_URL}/api/analytics/telemetry`);
    if (!res.ok) throw new Error('Failed to fetch telemetry');
    return await res.json();
  },

  async getConfig() {
    const res = await fetch(`${BASE_URL}/api/analytics/config`);
    if (!res.ok) throw new Error('Failed to fetch config');
    return await res.json();
  },

  async startScan(scanConfig) {
    const res = await fetch(`${BASE_URL}/api/scan/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scanConfig),
    });
    if (!res.ok) throw new Error('Failed to start scan');
    return await res.json();
  },

  async getScanHistory() {
    const res = await fetch(`${BASE_URL}/api/scan/history`);
    if (!res.ok) throw new Error('Failed to fetch scan history');
    return await res.json();
  },

  async inspectPrompt(prompt, targetModel = 'mock-aegis-shielded-enterprise', sensitivity = 0.75) {
    const res = await fetch(`${BASE_URL}/api/guard/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, target_model: targetModel, sensitivity }),
    });
    if (!res.ok) throw new Error('Failed to inspect prompt');
    return await res.json();
  },

  async getGuardMetrics() {
    const res = await fetch(`${BASE_URL}/api/guard/metrics`);
    if (!res.ok) throw new Error('Failed to fetch guard metrics');
    return await res.json();
  },

  async getLedgerBlocks(limit = 50) {
    const res = await fetch(`${BASE_URL}/api/ledger/blocks?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch ledger blocks');
    return await res.json();
  },

  async verifyBlockchain() {
    const res = await fetch(`${BASE_URL}/api/ledger/verify`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to verify blockchain');
    return await res.json();
  }
};
