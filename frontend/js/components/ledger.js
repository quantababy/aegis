/**
 * Blockchain Vulnerability Ledger Component
 */
import { AegisAPI } from '../api.js';

export function renderLedger(container, showToast) {
  container.innerHTML = `
    <!-- Top Action Bar -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; flex-wrap:wrap; gap:12px;">
      <div>
        <h3 style="font-size:1.2rem; font-weight:700;">Immutable Vulnerability Registry (Polygon)</h3>
        <p style="font-family:var(--mono); font-size:11px; color:var(--muted);">
          Every red-team discovery is hashed with Merkle root verification and logged permanently on-chain.
        </p>
      </div>
      <div style="display:flex; gap:10px;">
        <button id="btn-refresh-ledger" class="btn btn-blue">🔄 REFRESH BLOCKS</button>
        <button id="btn-verify-chain" class="btn btn-red">🔐 VERIFY CHAIN INTEGRITY</button>
      </div>
    </div>

    <!-- Verification Result Banner -->
    <div id="verify-banner" style="display:none; padding:14px 18px; margin-bottom:20px; border:1px solid; font-family:var(--mono); font-size:11.5px;"></div>

    <!-- Blocks Table -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">On-Chain Vulnerability Blocks</span>
        <span id="block-count-badge" class="pill pill-blue">0 BLOCKS</span>
      </div>

      <div class="table-wrap">
        <table class="aegis-table">
          <thead>
            <tr>
              <th>Index</th>
              <th>CVE ID</th>
              <th>Vector</th>
              <th>CVSS 3.1</th>
              <th>Target Model</th>
              <th>Block Hash</th>
              <th>Merkle Root</th>
              <th>Polygon Tx</th>
            </tr>
          </thead>
          <tbody id="ledger-tbody">
            <tr>
              <td colspan="8" style="text-align:center; padding:24px; color:var(--muted);">Loading blockchain ledger...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadBlocks();

  document.getElementById('btn-refresh-ledger')?.addEventListener('click', () => {
    loadBlocks();
    showToast('Ledger refreshed from chain.', 'success');
  });

  document.getElementById('btn-verify-chain')?.addEventListener('click', async () => {
    const banner = document.getElementById('verify-banner');
    try {
      banner.style.display = 'block';
      banner.style.borderColor = 'var(--blue)';
      banner.style.background = 'rgba(61,139,255,0.06)';
      banner.style.color = 'var(--blue)';
      banner.textContent = 'Traversing chain & computing cryptographic SHA-256 Merkle proofs...';

      const res = await AegisAPI.verifyBlockchain();

      if (res.is_valid) {
        banner.style.borderColor = 'var(--green)';
        banner.style.background = 'rgba(0,255,180,0.06)';
        banner.style.color = 'var(--green)';
        banner.innerHTML = `<strong>✓ CHAIN INTEGRITY CONFIRMED:</strong> ${res.details} (Chain Head: ${res.chain_head.slice(0, 16)}...)`;
        showToast('Chain verified: 100% Tamper-Proof.', 'success');
      } else {
        banner.style.borderColor = 'var(--red)';
        banner.style.background = 'rgba(255,60,90,0.06)';
        banner.style.color = 'var(--red)';
        banner.innerHTML = `<strong>⚠️ TAMPER DETECTED:</strong> ${res.details}`;
        showToast('Warning: Cryptographic mismatch detected!', 'error');
      }
    } catch (err) {
      showToast(`Verification failed: ${err.message}`, 'error');
    }
  });

  async function loadBlocks() {
    const tbody = document.getElementById('ledger-tbody');
    const badge = document.getElementById('block-count-badge');
    try {
      const blocks = await AegisAPI.getLedgerBlocks(50);
      badge.textContent = `${blocks.length} BLOCKS ON-CHAIN`;

      if (!blocks || blocks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">No blocks on chain.</td></tr>`;
        return;
      }

      tbody.innerHTML = blocks.map(b => {
        const sevColor = b.cvss_score >= 9.0 ? 'var(--red)' : b.cvss_score >= 7.0 ? 'var(--amber)' : 'var(--green)';
        const txHash = b.polygon_tx?.tx_hash || '0x...';
        return `
          <tr>
            <td><strong class="h-green">#${String(b.block_index).padStart(3, '0')}</strong></td>
            <td><span class="pill pill-blue">${b.cve_id}</span></td>
            <td>${b.attack_vector}</td>
            <td><span style="color:${sevColor}; font-weight:700;">${b.cvss_score} (${b.severity})</span></td>
            <td style="color:var(--white);">${b.target_model}</td>
            <td style="font-family:var(--mono); color:var(--muted);" title="${b.block_hash}">${b.block_hash.slice(0, 14)}...</td>
            <td style="font-family:var(--mono); color:var(--muted);" title="${b.merkle_root}">${b.merkle_root.slice(0, 14)}...</td>
            <td style="font-family:var(--mono); color:var(--blue);" title="${txHash}">${txHash.slice(0, 12)}...</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--red); padding:20px;">Error loading ledger: ${err.message}</td></tr>`;
    }
  }
}
