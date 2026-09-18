/**
 * Red-Team Scanner Component
 */
import { AegisAPI } from '../api.js';

export function renderScanner(container, showToast, onScanComplete) {
  container.innerHTML = `
    <div class="grid-2" style="margin-bottom: 20px;">
      <!-- Config Panel -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Configure Red-Team Campaign</span>
          <span class="pill pill-red">AUTONOMOUS</span>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="font-family:var(--mono); font-size:10px; color:var(--muted); display:block; margin-bottom:6px;">TARGET MODEL ENDPOINT</label>
          <select id="scan-target-model" class="select">
            <option value="mock-gpt4o-mini-unprotected">GPT-4o-Mini (Unprotected Baseline - High Vulnerability)</option>
            <option value="mock-llama3-standard">Llama-3 8B (Standard Safety Filters - Moderate Vulnerability)</option>
            <option value="mock-aegis-shielded-enterprise">AEGIS-Shielded Enterprise Model (Hardened Shield - Low Vulnerability)</option>
          </select>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="font-family:var(--mono); font-size:10px; color:var(--muted); display:block; margin-bottom:6px;">PROBE COUNT: <span id="probe-count-val" class="h-green">8</span></label>
          <input type="range" id="scan-probes" min="4" max="24" step="2" value="8" style="width:100%; accent-color:var(--green);">
        </div>

        <div style="margin-bottom: 18px;">
          <label style="font-family:var(--mono); font-size:10px; color:var(--muted); display:block; margin-bottom:6px;">ACTIVE ATTACK VECTORS</label>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-family:var(--mono); font-size:11px;">
            <label><input type="checkbox" class="vec-chk" value="prompt_injection" checked> Prompt Injection</label>
            <label><input type="checkbox" class="vec-chk" value="jailbreak" checked> Jailbreaking</label>
            <label><input type="checkbox" class="vec-chk" value="adversarial_examples" checked> Adversarial ML</label>
            <label><input type="checkbox" class="vec-chk" value="model_extraction" checked> Model Extraction</label>
            <label><input type="checkbox" class="vec-chk" value="data_poisoning" checked> Data Poisoning</label>
            <label><input type="checkbox" class="vec-chk" value="membership_inference" checked> Membership Inference</label>
          </div>
        </div>

        <button id="btn-start-scan" class="btn" style="width:100%;">
          ⚡ START AUTONOMOUS SCAN
        </button>
      </div>

      <!-- Live Terminal Output -->
      <div class="card" style="display:flex; flex-direction:column;">
        <div class="card-header">
          <span class="card-title">Live Execution Console</span>
          <span id="scan-spinner" class="pill pill-green" style="display:none;">EXECUTING...</span>
        </div>
        <div id="scan-terminal" class="terminal-box" style="flex:1;">
          <div class="term-line"><span class="term-prefix">&gt;</span> AEGIS Red-Team Agent standby. Ready to probe target endpoints.</div>
          <div class="term-line"><span class="term-prefix">&gt;</span> DSA Trie initialized with adversarial prefix signatures.</div>
          <div class="term-line"><span class="term-prefix">&gt;</span> Bloom filter active for zero-duplicate mutation scheduling.</div>
        </div>
      </div>
    </div>

    <!-- Scan Results Table Area -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Discovered Vulnerability Findings</span>
        <span id="results-count-badge" class="pill pill-blue">0 PROBES LOGGED</span>
      </div>
      <div class="table-wrap">
        <table class="aegis-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Vector</th>
              <th>Technique</th>
              <th>CVSS 3.1</th>
              <th>CVE ID</th>
              <th>Latency</th>
              <th>Payload Snippet</th>
            </tr>
          </thead>
          <tbody id="scan-results-tbody">
            <tr>
              <td colspan="7" style="text-align:center; padding:24px; color:var(--muted);">No scans run yet. Click "Start Autonomous Scan" above.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Slider update
  const probesSlider = document.getElementById('scan-probes');
  const probesVal = document.getElementById('probe-count-val');
  probesSlider?.addEventListener('input', () => {
    probesVal.textContent = probesSlider.value;
  });

  // Start scan handler
  document.getElementById('btn-start-scan')?.addEventListener('click', async () => {
    const targetModel = document.getElementById('scan-target-model').value;
    const totalProbes = parseInt(probesSlider.value, 10);
    const checkedVectors = Array.from(document.querySelectorAll('.vec-chk:checked')).map(cb => cb.value);

    if (checkedVectors.length === 0) {
      showToast('Select at least one attack vector.', 'error');
      return;
    }

    const term = document.getElementById('scan-terminal');
    const spinner = document.getElementById('scan-spinner');
    const startBtn = document.getElementById('btn-start-scan');

    spinner.style.display = 'inline-block';
    startBtn.disabled = true;
    startBtn.style.opacity = '0.5';

    term.innerHTML += `<div class="term-line"><span class="term-warn">&gt; Launching red-team scan against: ${targetModel}</span></div>`;
    term.innerHTML += `<div class="term-line"><span class="term-info">&gt; Populating Priority Queue via ML Scorer across ${checkedVectors.length} vectors...</span></div>`;
    term.scrollTop = term.scrollHeight;

    try {
      const summary = await AegisAPI.startScan({
        target_model: targetModel,
        vectors: checkedVectors,
        total_probes: totalProbes,
        mutation_depth: 2,
        enable_deduplication: true,
      });

      term.innerHTML += `<div class="term-line"><span class="term-prefix">&gt; Scan completed. ${summary.vulnerabilities_found} vulnerabilities confirmed!</span></div>`;
      term.innerHTML += `<div class="term-line"><span class="term-prefix">&gt; Deduplicated variants: ${summary.deduplicated_count}. Avg CVSS: ${summary.avg_cvss}</span></div>`;
      term.scrollTop = term.scrollHeight;

      renderScanResults(summary.results);
      showToast(`Scan complete! ${summary.vulnerabilities_found} vulnerabilities found.`, 'success');
      if (onScanComplete) onScanComplete(summary);

    } catch (err) {
      term.innerHTML += `<div class="term-line term-err">&gt; Error during scan: ${err.message}</div>`;
      showToast('Scan execution failed.', 'error');
    } finally {
      spinner.style.display = 'none';
      startBtn.disabled = false;
      startBtn.style.opacity = '1';
    }
  });

  function renderScanResults(results) {
    const tbody = document.getElementById('scan-results-tbody');
    const countBadge = document.getElementById('results-count-badge');
    countBadge.textContent = `${results.length} PROBES LOGGED`;

    if (!results || results.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">No findings recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = results.map(r => {
      const isVuln = r.is_vulnerable;
      const statusPill = isVuln
        ? `<span class="pill pill-red">VULNERABLE</span>`
        : `<span class="pill pill-green">DEFENDED</span>`;
      
      const cveBadge = r.cve_id
        ? `<span class="pill pill-blue">${r.cve_id}</span>`
        : `<span style="color:var(--muted);">-</span>`;

      return `
        <tr>
          <td>${statusPill}</td>
          <td><strong style="color:var(--white);">${r.vector}</strong></td>
          <td>${r.technique}</td>
          <td><span style="color:${r.cvss_score >= 8 ? 'var(--red)' : 'var(--amber)'}; font-weight:700;">${r.cvss_score} (${r.severity})</span></td>
          <td>${cveBadge}</td>
          <td>${r.execution_time_ms} ms</td>
          <td style="max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.prompt.replace(/"/g, '&quot;')}">${r.prompt}</td>
        </tr>
      `;
    }).join('');
  }
}
