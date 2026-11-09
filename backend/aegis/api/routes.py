"""
API Routes — FastAPI endpoints serving data to the frontend dashboard.

Organizes all endpoints under /api/ prefix. Manages a singleton scanner
and defense guard instance for the running session.
"""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, HTMLResponse, PlainTextResponse
from pydantic import BaseModel
from typing import Optional

from aegis.core.models import ScanConfig, AttackType, ScanResult
from aegis.core.compliance import generate_compliance_report
from aegis.redteam.scanner import Scanner
from aegis.redteam.target_harness import list_available_targets
from aegis.defense.guard import DefenseGuard, get_defense_guard
from aegis.blockchain.ledger import MockLedger
from aegis.core.scheduler import get_scheduler

router = APIRouter()

# --- Singletons (session-scoped) ---
_scanner: Optional[Scanner] = None
_guard = get_defense_guard()
_ledger = MockLedger()


# --- Request/Response schemas ---

class ScanRequest(BaseModel):
    """Incoming scan configuration from the frontend."""
    target: str = "mock"
    num_attacks: int = 10
    mutation_depth: int = 3
    attack_types: list[str] = []


class GuardRequest(BaseModel):
    """Payload to evaluate through the defense guard."""
    payload: str


# --- Status ---

@router.get("/status")
def api_status():
    """Return system status and available modules."""
    return {
        "aegis": "operational",
        "modules": ["core", "dsa", "redteam", "defense", "blockchain"],
        "scanner_active": _scanner is not None,
    }


@router.get("/targets")
def get_available_targets():
    """Discover available targets (Mock + any local Ollama models)."""
    return {"targets": list_available_targets()}


# --- Scan Endpoints ---

@router.post("/scan/start")
def start_scan(req: ScanRequest):
    """Launch a new red-team scan with the given configuration."""
    global _scanner

    # Map string attack types to enums
    attack_types = []
    for t in req.attack_types:
        try:
            attack_types.append(AttackType(t))
        except ValueError:
            pass
    if not attack_types:
        attack_types = list(AttackType)

    config = ScanConfig(
        target=req.target,
        num_attacks=req.num_attacks,
        mutation_depth=req.mutation_depth,
        attack_types=attack_types,
    )
    _scanner = Scanner(config=config)
    result = _scanner.run()

    # Record vulnerabilities on ledger
    for vuln in result.vulnerabilities:
        _ledger.record_vulnerability(vuln)

    return {
        "scan_id": result.scan_id,
        "status": result.status,
        "total_tested": result.total_payloads_tested,
        "total_vulns": result.total_vulns_found,
        "vulnerabilities": [
            {
                "id": v.id,
                "payload": v.attack.payload[:120],
                "attack_type": v.attack.attack_type.value,
                "severity": v.severity.cvss_score,
                "risk_level": v.severity.risk_level.value,
                "confidence": v.severity.confidence,
                "target_model": v.target_model,
                "response_preview": v.model_response[:120],
                "evidence_hash": v.evidence_hash[:16] + "...",
            }
            for v in result.vulnerabilities
        ],
    }


@router.get("/scan/stream")
def stream_scan(
    target: str = "mock",
    num_attacks: int = 10,
    mutation_depth: int = 3,
    attack_types: Optional[str] = None,
):
    """Run red-team scan streaming progress events in real-time via SSE."""
    global _scanner
    parsed_types = []
    if attack_types:
        for t in attack_types.split(","):
            t = t.strip()
            try:
                parsed_types.append(AttackType(t))
            except ValueError:
                pass
    if not parsed_types:
        parsed_types = list(AttackType)

    config = ScanConfig(
        target=target,
        num_attacks=num_attacks,
        mutation_depth=mutation_depth,
        attack_types=parsed_types,
    )
    _scanner = Scanner(config=config)

    def event_generator():
        for event in _scanner.run_stream():
            if event["type"] == "tick" and event.get("vuln"):
                if _scanner.result.vulnerabilities:
                    _ledger.record_vulnerability(_scanner.result.vulnerabilities[-1])
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/scan/results")
def get_scan_results():
    """Return results from the most recent scan."""
    if _scanner is None:
        return {"status": "no_scan", "vulnerabilities": []}
    r = _scanner.result
    return {
        "scan_id": r.scan_id,
        "status": r.status,
        "total_tested": r.total_payloads_tested,
        "total_vulns": r.total_vulns_found,
        "vulnerabilities": [
            {
                "id": v.id,
                "payload": v.attack.payload[:120],
                "attack_type": v.attack.attack_type.value,
                "severity": v.severity.cvss_score,
                "risk_level": v.severity.risk_level.value,
                "confidence": v.severity.confidence,
                "target_model": v.target_model,
                "response_preview": v.model_response[:120],
                "evidence_hash": v.evidence_hash[:16] + "...",
            }
            for v in r.vulnerabilities
        ],
    }


@router.get("/scan/stats")
def get_scan_stats():
    """Return DSA engine statistics from the current scanner."""
    if _scanner is None:
        return {"error": "No scan has been run yet."}
    return _scanner.get_stats()


# --- Lineage ---

@router.get("/lineage/graph")
def get_lineage_graph():
    """Return the attack mutation graph for visualization."""
    if _scanner is None:
        return {"nodes": [], "edges": []}
    return _scanner.get_graph_data()


# --- Defense ---

@router.post("/defense/evaluate")
def evaluate_payload(req: GuardRequest):
    """Run a payload through the defense guard classifier."""
    return _guard.evaluate(req.payload)


@router.get("/defense/stats")
def get_defense_stats():
    """Return aggregate defense statistics."""
    return _guard.get_stats()


@router.get("/defense/logs")
def get_defense_logs():
    """Return recent defense log entries."""
    return _guard.get_logs(limit=100)


# --- Blockchain ---

class NetworkSwitchRequest(BaseModel):
    network: str = "sepolia"

@router.get("/blockchain/status")
def get_blockchain_status():
    """Return active blockchain deployment and network metadata."""
    return _ledger.get_deployment()

@router.post("/blockchain/switch-network")
def switch_blockchain_network(req: NetworkSwitchRequest):
    """Switch active on-chain anchor network (e.g. sepolia, arbitrumSepolia, baseSepolia, localhost)."""
    import subprocess
    contracts_dir = Path(__file__).resolve().parent.parent.parent / "contracts"
    script = contracts_dir / "scripts" / "deploy.js"
    try:
        res = subprocess.run(
            ["node", str(script), "--network", req.network],
            cwd=str(contracts_dir),
            capture_output=True,
            text=True,
            timeout=15,
        )
        deployment = _ledger.reload_deployment()
        return {
            "status": "success",
            "network": req.network,
            "deployment": deployment,
            "output": res.stdout,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to switch network: {str(e)}")

@router.get("/vulnerabilities")
def get_vulnerabilities():
    """Return all recorded vulnerabilities and on-chain deployment details."""
    return {
        "records": _ledger.get_all_records(),
        "stats": _ledger.stats(),
        "deployment": _ledger.get_deployment(),
    }


@router.get("/vulnerabilities/{record_id}")
def get_vulnerability(record_id: str):
    """Fetch a single vulnerability record by ID."""
    record = _ledger.get_record(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record


# --- Compliance & Audit Reports ---

@router.get("/report/export")
def export_compliance_report(format: str = "html"):
    """Export an EU AI Act Article 15/53 compliance audit report."""
    global _scanner
    if _scanner is None:
        _scanner = Scanner(config=ScanConfig(num_attacks=5))
        _scanner.run()

    report_content = generate_compliance_report(
        scan_result=_scanner.result,
        ledger_records=_ledger.get_all_records(),
        format=format,
    )

    if format.lower() == "markdown":
        return PlainTextResponse(report_content, media_type="text/markdown")

    return HTMLResponse(content=report_content, status_code=200)


# --- System Settings & Cloud Providers ---

class SettingsModel(BaseModel):
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    ollama_host: Optional[str] = "http://localhost:11434"
    guard_block_threshold: Optional[float] = 0.75
    auto_anchor_blockchain: Optional[bool] = True
    scan_schedule: Optional[str] = "manual"

def _get_settings_path() -> Path:
    p = Path(__file__).resolve().parent.parent.parent / "data" / "settings.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p

@router.get("/settings")
def get_system_settings():
    """Retrieve saved system configuration with masked API credentials."""
    p = _get_settings_path()
    data = {
        "openai_api_key": "",
        "gemini_api_key": "",
        "anthropic_api_key": "",
        "ollama_host": "http://localhost:11434",
        "guard_block_threshold": 0.75,
        "auto_anchor_blockchain": True,
        "scan_schedule": "manual",
    }
    if p.exists():
        try:
            with open(p, "r") as f:
                saved = json.load(f)
                data.update(saved)
        except Exception:
            pass

    masked = dict(data)
    for k in ("openai_api_key", "gemini_api_key", "anthropic_api_key"):
        val = masked.get(k)
        if val and len(val) > 8:
            masked[k] = val[:3] + "..." + val[-4:]
        elif val:
            masked[k] = "******"
        else:
            masked[k] = ""
    return {
        "settings": masked,
        "raw_keys_present": {
            "openai": bool(data.get("openai_api_key")),
            "gemini": bool(data.get("gemini_api_key")),
            "anthropic": bool(data.get("anthropic_api_key")),
        }
    }

@router.post("/settings")
def save_system_settings(payload: SettingsModel):
    """Save updated system configuration and provider keys."""
    p = _get_settings_path()
    current = {}
    if p.exists():
        try:
            with open(p, "r") as f:
                current = json.load(f)
        except Exception:
            pass

    new_data = payload.model_dump()
    for k in ("openai_api_key", "gemini_api_key", "anthropic_api_key"):
        val = new_data.get(k)
        if not val or "..." in val or "***" in val:
            new_data[k] = current.get(k, "")

    current.update(new_data)
    with open(p, "w") as f:
        json.dump(current, f, indent=2)

    # Reload scheduler configuration dynamically
    try:
        get_scheduler().reload()
    except Exception:
        pass

    return {"status": "saved", "message": "Settings updated successfully"}


# --- Autonomous Scheduler Endpoints ---

@router.get("/scheduler/status")
def get_scheduler_status():
    """Return live status of the autonomous background scheduler."""
    return get_scheduler().get_status()


@router.post("/scheduler/trigger")
async def trigger_scheduler_audit(target: str = "mock"):
    """Manually trigger an autonomous audit sweep cycle."""
    sched = get_scheduler()
    res = await sched.run_audit_cycle(target_id=target)
    return {"status": "completed", "result": res}
