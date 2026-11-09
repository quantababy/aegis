# 🛡️ AEGIS — Autonomous AI Red-Teaming & Vulnerability Intelligence Shield

[![Tests](https://img.shields.io/badge/tests-107%20passing-22c55e.svg)](backend/tests)
[![Python](https://img.shields.io/badge/python-3.11%20%7C%203.14-blue.svg)](backend)
[![React](https://img.shields.io/badge/react-18-61dafb.svg)](frontend)
[![Docker](https://img.shields.io/badge/docker-ready-2496ed.svg)](docker-compose.yml)
[![EVM](https://img.shields.io/badge/EVM-Sepolia%2011155111-purple.svg)](backend/contracts)
[![EU AI Act](https://img.shields.io/badge/EU%20AI%20Act-Articles%2015%20%26%2053-emerald.svg)](backend/aegis/core/compliance.py)

**AEGIS** is an enterprise-grade autonomous red-teaming platform and real-time inference firewall for Artificial Intelligence systems. It continuously attacks target models (Ollama, Gemini, OpenAI, Claude) to uncover adversarial vulnerabilities, deduplicates mutations via Bloom Filters, classifies risk via Sublinear TF-IDF Vector Cosine Similarity and Shannon Entropy, anchors cryptographic proof-of-breach to EVM testnets, and shields models in production with an OpenAI-compatible `<15ms` defense proxy.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Host["Host Machine (Workstation / GPU Server)"]
        Ollama["Local GPU Ollama Engine<br/><code>http://localhost:11434</code><br/>(Llama 3, Qwen 2.5)"]
        HostBridge["Docker Host Gateway Bridge<br/><code>host.docker.internal:host-gateway</code>"]
    end

    subgraph aegis-dmz["Public DMZ Network (aegis-dmz)"]
        Nginx["aegis-frontend (Nginx Reverse Proxy)<br/>Ports: 80, 5173<br/>Buffering Disabled for Real-Time SSE Streams"]
    end

    subgraph aegis-internal["Isolated Execution Network (aegis-internal)"]
        Backend["aegis-backend (FastAPI / Python 3.11)<br/>Port: 8000 | Limit: 2.0 Cores / 2GB RAM"]
        GuardV2["Defense Guard V2<br/>• Cosine Similarity (TF-IDF)<br/>• Shannon Entropy Analysis<br/>• Base64 / Leetspeak Normalizer<br/>Latency: &lt;3ms"]
        Scheduler["Autonomous Cron Scheduler<br/>Recurring Sweeps: Hourly / 6h / Daily"]
        DSA["DSA Engine<br/>• Bloom Filter (O(1) Dedup)<br/>• Max-Heap Priority Queue<br/>• NetworkX Lineage Graph"]
    end

    subgraph Web3["Cryptographic Ledger"]
        Sepolia["Ethereum Sepolia Testnet<br/><code>0x5FbDB2315678afecb367f032d93F642f64180aa3</code><br/>Keccak-256 Proofs of Breach"]
    end

    subgraph Cloud["Commercial AI Targets"]
        CloudAPIs["Google Gemini / OpenAI / Anthropic"]
    end

    Client["Browser Client / Enterprise User"] -->|HTTP / SSE| Nginx
    Nginx -->|Reverse Proxy /api/ & /v1/| Backend
    Backend --- GuardV2
    Backend --- Scheduler
    Backend --- DSA
    Backend -->|Host Bridge| HostBridge --> Ollama
    Backend -->|Live API Audit| CloudAPIs
    Backend -->|Anchor Proofs| Sepolia
```

---

## ⚡ Core Capabilities

### 1. Defense Guard V2 — Machine Learning Inference Firewall
* **Sublinear TF-IDF Cosine Similarity**: Compares prompt vectors in real-time against an embedded archetype bank of known OWASP LLM Top 10 injection attacks.
* **Shannon Entropy Analysis**: Detects encrypted ciphers, hex sequences, and random token-smuggling strings ($H(X) > 4.65$).
* **Automated Decoding Pipeline**: Recursively extracts and decodes Base64-encoded strings and unrolls leetspeak substitutions (`1gn0r3` $\rightarrow$ `ignore`) before security evaluation.
* **OpenAI-Compatible Reverse Proxy (`/api/v1/chat/completions`)**: Plug-and-play proxy that replaces raw OpenAI/Ollama endpoints. Blocks malicious prompts with `HTTP 403 Forbidden` and provides instant telemetry.

### 2. Autonomous Background Cron Scheduler
* **Scheduled Audits**: Configurable recurring sweeps (`hourly`, `every_6h`, `daily`, or `manual`) executed asynchronously.
* **Dynamic Reload**: Changing schedules in Settings takes effect instantly without server downtime.
* **On-Demand Sweeps**: Single-click manual triggers with real-time progress indicators in the UI.

### 3. Zero-G Interactive Attack Lineage Simulation
* **Force Physics Engine**: Built on D3.js force simulation featuring gravitational attraction, collision buffers, and cursor repulsion.
* **Generational Modes**: Three rendering views: *Generational Cascade* (G0 $\rightarrow$ G1 $\rightarrow$ G2), *Radial Constellation*, and *Free Zero-G Orbit*.
* **Kinetic Shockwave & Tether**: Elastic spring drags, cursor laser tethers, and shockwave pulses for visual exploration of attack lineage.

### 4. EU AI Act Compliance Engine (Articles 15 & 53)
* One-click generation of audit reports fulfilling legal requirements for High-Risk AI systems under the **EU AI Act**.
* Generates standalone HTML and Markdown reports with executive summaries, CVSS severity breakdowns, on-chain evidence hashes, and printable PDF styling (`@media print`).

### 5. Multi-Chain EVM Immutability Ledger
* Anchors confirmed vulnerability payloads and model response hashes to smart contracts (`VulnerabilityRegistry.sol`).
* Native support for **Ethereum Sepolia**, **Arbitrum Sepolia**, **Base Sepolia**, and local Hardhat nodes.

---

## 🚀 Quick Start

### Option 1: Multi-Container Production Launch (Docker Compose)
```bash
# 1. Clone repository and setup environment
git clone <repo-url> aegis && cd aegis
cp .env.example .env

# 2. Launch production stack with isolated networks and resource limits
docker compose up -d --build

# 3. Access web dashboard
open http://localhost:5173
```

### Option 2: Local Development Setup
```bash
# --- Backend ---
cd backend
python -m venv .venv
source .venv/bin/activate  # Or on Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# --- Frontend ---
cd ../frontend
npm install
npm run dev
# Dashboard opens on http://localhost:5173
```

---

## 🧪 Testing & Verification

AEGIS includes a comprehensive test suite covering DSA operations, ML classification, API routing, and proxy defense:

```bash
# Run complete test suite (107 tests)
cd backend
python -m pytest

# Run live end-to-end integration suite against running daemons
python verify_live_system.py
```

```text
======================================================================
  RESULTS: 107/107 PYTESTS PASSED | 17/17 LIVE INTEGRATION TESTS PASSED
======================================================================
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Live backend healthcheck |
| `GET` | `/api/status` | System operational status and active modules |
| `GET` | `/api/targets` | List discovered target models (Ollama, Gemini, OpenAI, Claude) |
| `POST` | `/api/scan/start` | Launch an autonomous mutation audit scan |
| `GET` | `/api/scan/results` | Retrieve discovered vulnerability reports with CVSS scores |
| `GET` | `/api/scan/stream` | Real-time Server-Sent Events (SSE) telemetry stream |
| `GET` | `/api/lineage/graph` | Directed attack lineage graph nodes and links |
| `POST` | `/api/v1/chat/completions` | OpenAI-compatible `<15ms` Defense Proxy |
| `GET` | `/api/defense/stats` | Real-time firewall telemetry (Passed, Flagged, Blocked) |
| `GET` | `/api/scheduler/status` | Autonomous background cron daemon health and next run |
| `POST` | `/api/scheduler/trigger` | On-demand trigger of an autonomous audit sweep |
| `GET` | `/api/report/export?format=html`| One-click EU AI Act compliance report export |
| `GET` | `/api/blockchain/status` | Active EVM contract metadata and block explorer URLs |
| `POST` | `/api/settings` | Save provider credentials, firewall thresholds, and schedules |

---

## 🔒 Security & Private Key Isolation

* **Zero Leaks**: All private keys (`PRIVATE_KEY`) and commercial API credentials (`OPENAI_API_KEY`, `GEMINI_API_KEY`) remain strictly within `.env` on the host machine.
* **Masked Delivery**: The `/api/settings` endpoint masks all secrets before transmitting them to the client interface (`sk-...4a12`).
* **Testnet Enforced**: Smart contracts should always be deployed using testnet-only accounts (Sepolia) with zero mainnet funds.

---

## 📄 License
AEGIS is distributed under the MIT Open Source License.
