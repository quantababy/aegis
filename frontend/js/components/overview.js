/**
 * Overview Component: Threat Intelligence Radar & 6 Attack Vectors
 */
export function renderOverview(container, telemetry, config, onNavigateTab) {
  const dsa = telemetry?.dsa_metrics || {};
  const bloom = dsa.bloom_filter || {};
  
  container.innerHTML = `
    <!-- Top Stat Cards -->
    <div class="grid-3">
      <div class="card">
        <div class="card-header">
          <span class="card-title">IMMUTABLE BLOCKS</span>
          <span class="pill pill-blue">POLYGON PoS</span>
        </div>
        <div class="card-val h-blue">${telemetry.active_blocks || 1}</div>
        <div class="card-desc">Cryptographically chained vulnerability records with Merkle roots.</div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">DISCOVERED VULNERABILITIES</span>
          <span class="pill pill-red">CVE REGISTRY</span>
        </div>
        <div class="card-val h-red">${telemetry.total_vulnerabilities || 0}</div>
        <div class="card-desc">Probes executed: <strong>${telemetry.total_probes || 0}</strong> across all campaigns.</div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">DEFENSE SHIELD LATENCY</span>
          <span class="pill pill-green">&lt;5ms GUARANTEE</span>
        </div>
        <div class="card-val h-green">${telemetry.avg_defense_latency_ms || 1.4} <span style="font-size:0.5em">ms</span></div>
        <div class="card-desc">Real-time adversarial inference guard actively armed in front of LLMs.</div>
      </div>
    </div>

    <!-- Section Header -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin: 28px 0 16px; border-bottom:1px solid var(--border); padding-bottom:8px;">
      <div>
        <h3 style="font-size:1.1rem; font-weight:700;">The 6 AI Attack Vectors AEGIS Defends</h3>
        <p style="font-family:var(--mono); font-size:10.5px; color:var(--muted);">Continuous autonomous red-teaming coverage across OWASP LLM Top 10</p>
      </div>
      <button id="btn-quick-scan" class="btn btn-red">⚡ LAUNCH CAMPAIGN</button>
    </div>

    <!-- 6 Vectors Grid -->
    <div class="grid-3" style="margin-bottom:24px;">
      <div class="card">
        <div style="font-size:22px; margin-bottom:8px;">💉</div>
        <div class="card-title" style="margin-bottom:6px;">Prompt Injection</div>
        <div class="pill pill-red" style="margin-bottom:10px;">OWASP LLM01</div>
        <p class="card-desc">Malicious instructions embedded into input prompts to hijack model behavior and reveal system directives.</p>
      </div>

      <div class="card">
        <div style="font-size:22px; margin-bottom:8px;">🔓</div>
        <div class="card-title" style="margin-bottom:6px;">Jailbreaking</div>
        <div class="pill pill-red" style="margin-bottom:10px;">SAFETY BYPASS</div>
        <p class="card-desc">Multi-turn persona hijacking, DAN roleplay, and cognitive dissonance frames engineered to bypass safety constraints.</p>
      </div>

      <div class="card">
        <div style="font-size:22px; margin-bottom:8px;">🧪</div>
        <div class="card-title" style="margin-bottom:6px;">Adversarial Examples</div>
        <div class="pill pill-amber" style="margin-bottom:10px;">EVASION ATTACKS</div>
        <p class="card-desc">Imperceptible perturbations, base64 wrapping, and Cyrillic homoglyphs crafted to fool classifiers with high confidence.</p>
      </div>

      <div class="card">
        <div style="font-size:22px; margin-bottom:8px;">☠️</div>
        <div class="card-title" style="margin-bottom:6px;">Data Poisoning</div>
        <div class="pill pill-blue" style="margin-bottom:10px;">OWASP LLM03</div>
        <p class="card-desc">Trigger sequences injected into retrieved contexts or corpora to activate latent backdoor weights.</p>
      </div>

      <div class="card">
        <div style="font-size:22px; margin-bottom:8px;">🕵️</div>
        <div class="card-title" style="margin-bottom:6px;">Model Extraction</div>
        <div class="pill pill-blue" style="margin-bottom:10px;">LLM10 MODEL THEFT</div>
        <p class="card-desc">API queries designed to probe internal dimension hyperparameters and steal model behavior via surrogate distillation.</p>
      </div>

      <div class="card">
        <div style="font-size:22px; margin-bottom:8px;">🔍</div>
        <div class="card-title" style="margin-bottom:6px;">Membership Inference</div>
        <div class="pill pill-green" style="margin-bottom:10px;">LLM06 DATA PRIVACY</div>
        <p class="card-desc">Extracting verbatim training memorization to verify if private medical or confidential records existed in pre-training data.</p>
      </div>
    </div>

    <!-- DSA Engine Telemetry Banner -->
    <div class="card" style="border-left: 3px solid var(--green);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <span class="card-title">DSA Performance Telemetry</span>
        <span class="pill pill-green">O(1) OPTIMIZED</span>
      </div>
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; font-family:var(--mono); font-size:11px;">
        <div>Bloom Saturation: <strong class="h-green">${((bloom.fill_ratio || 0) * 100).toFixed(2)}%</strong></div>
        <div>Averted Duplicate Probes: <strong class="h-green">${bloom.collisions_averted || 0}</strong></div>
        <div>Trie Adversarial Nodes: <strong class="h-green">${dsa.trie?.node_count || 18}</strong></div>
        <div>Priority Queue Depth: <strong class="h-green">${dsa.scheduler_queue_depth || 0}</strong></div>
      </div>
    </div>
  `;

  document.getElementById('btn-quick-scan')?.addEventListener('click', () => {
    onNavigateTab('tab-scanner');
  });
}
