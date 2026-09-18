/**
 * AEGIS Frontend Application Controller
 */
import { AegisAPI } from './api.js';
import { renderOverview } from './components/overview.js';
import { renderScanner } from './components/scanner.js';
import { renderShield } from './components/shield.js';
import { renderLedger } from './components/ledger.js';
import { renderDsaInspector } from './components/dsa_inspector.js';

class AegisApp {
  constructor() {
    this.telemetry = null;
    this.config = null;
    this.currentTab = 'tab-overview';
  }

  async init() {
    this.setupClock();
    this.setupTabs();

    try {
      const [telemetry, config] = await Promise.all([
        AegisAPI.getTelemetry(),
        AegisAPI.getConfig()
      ]);
      this.telemetry = telemetry;
      this.config = config;
      this.updateHeaderStats();
    } catch (err) {
      console.warn('Initial telemetry load warning:', err);
      this.telemetry = { active_blocks: 1, total_vulnerabilities: 0, avg_defense_latency_ms: 1.2 };
    }

    this.renderCurrentTab();
  }

  setupClock() {
    const clockEl = document.getElementById('live-clock');
    setInterval(() => {
      const now = new Date();
      if (clockEl) {
        clockEl.textContent = 'UTC ' + now.toISOString().slice(11, 19);
      }
    }, 1000);
  }

  setupTabs() {
    document.querySelectorAll('.nav-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const targetTab = tabBtn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll('.nav-tab').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === tabId);
    });
    this.renderCurrentTab();
  }

  async refreshTelemetry() {
    try {
      this.telemetry = await AegisAPI.getTelemetry();
      this.updateHeaderStats();
    } catch (err) {
      console.error('Failed to refresh telemetry', err);
    }
  }

  updateHeaderStats() {
    const hdrBlocks = document.getElementById('hdr-blocks');
    const hdrVulns = document.getElementById('hdr-vulns');
    if (hdrBlocks) hdrBlocks.textContent = this.telemetry?.active_blocks || 1;
    if (hdrVulns) hdrVulns.textContent = this.telemetry?.total_vulnerabilities || 0;
  }

  renderCurrentTab() {
    const container = document.getElementById(this.currentTab);
    if (!container) return;

    if (this.currentTab === 'tab-overview') {
      renderOverview(container, this.telemetry, this.config, (tab) => this.switchTab(tab));
    } else if (this.currentTab === 'tab-scanner') {
      renderScanner(container, this.showToast.bind(this), () => this.refreshTelemetry());
    } else if (this.currentTab === 'tab-shield') {
      renderShield(container, this.showToast.bind(this));
    } else if (this.currentTab === 'tab-ledger') {
      renderLedger(container, this.showToast.bind(this));
    } else if (this.currentTab === 'tab-dsa') {
      renderDsaInspector(container, this.telemetry);
    }
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${type === 'error' ? '⚠️' : '✓'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new AegisApp();
  app.init();
});
