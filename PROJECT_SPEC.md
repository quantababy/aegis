# PROJECT_SPEC.md — AEGIS MVP Specification

## One-Line Summary
AEGIS automatically attacks AI models to find security vulnerabilities, classifies and scores them using ML, and records them on-chain — creating an open, tamper-proof CVE registry for AI systems.

---

## MVP Functional Requirements

### Module 1: Attack Taxonomy & Seed Registry
- Pydantic schemas for 6 attack vectors: Prompt Injection, Jailbreak, Adversarial Perturbation, Data Poisoning, Model Extraction, Membership Inference.
- CVSS-style severity (0.0–10.0) and reproducible seed attack records.

### Module 2: DSA Attack Engine
- `AttackBloomFilter` — O(1) duplicate suppression, zero false negatives.
- `AttackQueue` — Max-heap priority queue ordering by predicted severity.
- `AttackGraph` — Directed graph tracking parent→child mutation lineage with BFS/DFS.

### Module 3: Autonomous Red-Team Pipeline
- FAISS vector knowledge base (all-MiniLM-L6-v2 embeddings) for semantic retrieval.
- Mutation engine generating parameterized attack variants.
- Target evaluation harness executing against local/mock sandboxed targets.

### Module 4: ML Severity Triage & Defense Guard
- Attack classifier predicting attack family.
- Severity scorer predicting CVSS score (0.0–10.0).
- FastAPI middleware intercepting requests, blocking threats (>threshold) with <15ms overhead.

### Module 5: Decentralized Vulnerability Ledger
- Solidity smart contract (`VulnerabilityRegistry.sol`) anchoring immutable records.
- Python Web3 client for write-read cycle and keccak256 hash verification.

### Module 6: Developer CLI
- `aegis scan` — run end-to-end red-team scan.
- `aegis guard` — start defense middleware.
- `aegis report` — generate vulnerability report.

### Module 7: Interactive Frontend Dashboard
- **Dashboard** — live scan status, severity distribution chart, recent activity.
- **Scan Control** — start/stop scans, configure target and attack count, progress bar.
- **Vulnerability Registry** — sortable/filterable table with severity badges, tx links.
- **Attack Lineage** — interactive graph of parent→variant mutation chains.
- **Defense Monitor** — real-time blocked/passed feed, latency metrics.

---

## Non-Goals (Explicitly Out of Scope)
- ❌ No attacking external production AI endpoints (OpenAI, Anthropic, etc.).
- ❌ No multi-agent distributed consensus swarms.
- ❌ No training large GNN models from scratch.
- ❌ No multi-cloud Kubernetes infrastructure.
- ❌ No complex multi-page microfrontend framework.

---

## Acceptance Criteria
1. Bloom filter identifies 100% of seen payloads within capacity bounds.
2. Priority queue dequeues highest-severity first across 1000+ items.
3. Graph traversal recovers complete mutation family trees via BFS.
4. `aegis scan --target mock --attacks 10` runs end-to-end: retrieve → mutate → evaluate → score → report.
5. Defense middleware blocks malicious payloads (HTTP 403), passes benign traffic, <15ms overhead.
6. Vulnerability hashes verified on local Hardhat/EVM test node match keccak256 of evidence.
7. Frontend dashboard loads, displays scan results from backend API, updates in near real-time.
8. Every public backend function has a concise docstring.
9. Full test suite passes with `pytest`.
