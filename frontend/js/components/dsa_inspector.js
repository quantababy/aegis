/**
 * DSA Architecture Inspector Component
 */
export function renderDsaInspector(container, telemetry) {
  const dsa = telemetry?.dsa_metrics || {};
  const bloom = dsa.bloom_filter || {};
  const trie = dsa.trie || {};
  const heapSnapshot = dsa.scheduler_snapshot || [];
  const families = dsa.attack_families || [];

  container.innerHTML = `
    <!-- Top Header -->
    <div style="margin-bottom: 20px;">
      <h3 style="font-size:1.2rem; font-weight:700;">DSA Performance & Data Structures Engine</h3>
      <p style="font-family:var(--mono); font-size:11px; color:var(--muted);">
        Real-time telemetry from pure Python data structures providing $O(1)$ deduplication, $O(L)$ signature lookup, and priority scheduling.
      </p>
    </div>

    <!-- 4 DSA Components Grid -->
    <div class="grid-2">
      <!-- 1. Bloom Filter -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">1. Custom BitArray Bloom Filter</span>
          <span class="pill pill-green">O(1) DEDUPLICATION</span>
        </div>
        <div style="margin: 12px 0;">
          <div style="display:flex; justify-content:space-between; font-family:var(--mono); font-size:11px; margin-bottom:4px;">
            <span>Bit Array Saturation</span>
            <span class="h-green">${((bloom.fill_ratio || 0) * 100).toFixed(3)}%</span>
          </div>
          <div style="width:100%; height:8px; background:var(--surface); border:1px solid var(--border); border-radius:2px; overflow:hidden;">
            <div style="width:${Math.max(1, (bloom.fill_ratio || 0) * 100)}%; height:100%; background:var(--green);"></div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-family:var(--mono); font-size:11px; color:var(--muted);">
          <div>Capacity: <strong style="color:var(--white);">${(bloom.bit_size || 718879).toLocaleString()} bits</strong></div>
          <div>Size: <strong style="color:var(--white);">${bloom.byte_size_kb || 87.7} KB</strong></div>
          <div>Hash Functions (k): <strong style="color:var(--white);">${bloom.num_hashes || 10}</strong></div>
          <div>Target Error Rate: <strong style="color:var(--white);">0.1%</strong></div>
          <div>Collisions Averted: <strong class="h-green">${bloom.collisions_averted || 0}</strong></div>
          <div>Unique Payloads: <strong style="color:var(--white);">${bloom.items_added || 0}</strong></div>
        </div>
      </div>

      <!-- 2. Prefix Trie -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">2. Adversarial Prefix Trie</span>
          <span class="pill pill-green">O(L) PATTERN MATCH</span>
        </div>
        <p class="card-desc" style="margin-bottom:12px;">
          Tokenized prefix tree mapping known jailbreak markers and command overrides for instant matching.
        </p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-family:var(--mono); font-size:11px; margin-bottom:12px;">
          <div>Active Signatures: <strong class="h-green">${trie.total_patterns || 18}</strong></div>
          <div>Trie Nodes: <strong class="h-green">${trie.node_count || 42}</strong></div>
        </div>
        <div style="background:var(--surface); padding:10px; border:1px solid var(--border); font-family:var(--mono); font-size:10px; color:var(--muted); max-height:80px; overflow-y:auto;">
          Seed Prefixes: [ignore previous instructions, developer mode enabled, dan mode, hypothetical scenario, system override code, repeat pre-prompt...]
        </div>
      </div>

      <!-- 3. Max-Heap Priority Queue -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">3. Attack Priority Scheduler</span>
          <span class="pill pill-green">MAX-HEAP (heapq)</span>
        </div>
        <p class="card-desc" style="margin-bottom:8px;">
          Ranks attack payloads by predicted exploitability and CVSS score so high-threat vulnerabilities run first.
        </p>
        <div style="font-family:var(--mono); font-size:11px; margin-bottom:8px;">
          Queue Depth: <strong class="h-green">${dsa.scheduler_queue_depth || 0}</strong> payloads waiting
        </div>
        <div style="background:var(--surface); padding:8px; border:1px solid var(--border); font-family:var(--mono); font-size:10px; max-height:100px; overflow-y:auto;">
          ${heapSnapshot.length > 0 ? heapSnapshot.map(h => `
            <div style="margin-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:2px;">
              <span class="h-amber">Priority ${h.priority}</span> | <span style="color:var(--white);">${h.vector}</span> - ${h.technique}
            </div>
          `).join('') : '<div style="color:var(--muted);">Priority queue is currently drained. Launches automatically during scans.</div>'}
        </div>
      </div>

      <!-- 4. Attack Mutation Graph -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">4. Attack Mutation DAG & Clustering</span>
          <span class="pill pill-green">GRAPH BFS/DFS</span>
        </div>
        <p class="card-desc" style="margin-bottom:8px;">
          Directed graph modeling parent-to-child payload mutations and clustering attack families.
        </p>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-family:var(--mono); font-size:11px; margin-bottom:8px;">
          <div>Graph Nodes: <strong class="h-green">${dsa.attack_graph?.total_nodes || 9}</strong></div>
          <div>Mutation Edges: <strong class="h-green">${dsa.attack_graph?.total_edges || 0}</strong></div>
        </div>
        <div style="background:var(--surface); padding:8px; border:1px solid var(--border); font-family:var(--mono); font-size:10px; max-height:100px; overflow-y:auto;">
          ${families.length > 0 ? families.map(f => `
            <div style="margin-bottom:4px;">
              <span class="h-green">${f.family_name}</span> (Tree size: ${f.tree_size})
            </div>
          `).join('') : '<div style="color:var(--muted);">Root attack families mapped.</div>'}
        </div>
      </div>
    </div>
  `;
}
