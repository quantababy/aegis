# AGENTS.md — AEGIS Coding Agent Instructions

## Identity
You are building AEGIS — Autonomous AI Red-Teaming & Vulnerability Intelligence Shield.

## Rules
1. **Read PROJECT_SPEC.md** before making any changes. Do not add features outside the agreed scope.
2. **Read PROGRESS.md** to understand what is done, what is current, and what is next.
3. Work in **small batches** (4–5 related changes). After each batch, update PROGRESS.md.
4. **Do not rewrite working modules** for aesthetic reasons.
5. **Every backend function** gets a concise docstring (2–3 lines max). Inline comments only where logic is non-obvious.
6. **Tests are proportional** — verify agreed functionality, critical edge cases, and regressions. No speculative tests.
7. **Completion over sophistication** — a working MVP beats an impressive 80%-complete architecture.

## Architecture
- `backend/` — Python (FastAPI). All AEGIS logic lives here.
- `frontend/` — React (Vite). Interactive dashboard consuming backend API.
- Backend serves API on port 8000. Frontend dev server on port 5173.

## Restrictions
- No unauthorized scanning of external production AI endpoints.
- All target model interactions use local/mock sandboxed targets only.
- No adding dependencies without justification tied to an agreed requirement.
