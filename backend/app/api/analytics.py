"""System Analytics, Telemetry & DSA Metrics API."""
from typing import Dict, Any
from fastapi import APIRouter
from app.core.schemas import SystemTelemetry
from app.core.config import TARGET_MODELS, VECTOR_METADATA

router = APIRouter(prefix="/api/analytics", tags=["Telemetry & Analytics"])

@router.get("/telemetry", response_model=SystemTelemetry)
def get_telemetry():
    from app.main import state
    
    total_scans = len(state.scan_history)
    total_probes = sum(s.total_probes for s in state.scan_history.values())
    total_vulns = sum(s.vulnerabilities_found for s in state.scan_history.values())
    
    vector_dist = {}
    for s in state.scan_history.values():
        for vec, cnt in s.vector_breakdown.items():
            vector_dist[vec] = vector_dist.get(vec, 0) + cnt
            
    guard_metrics = state.guard.get_metrics()
    
    return SystemTelemetry(
        system_status="ACTIVE // ARMED",
        total_scans=total_scans,
        total_probes=total_probes,
        total_vulnerabilities=total_vulns,
        active_blocks=len(state.ledger.chain),
        avg_defense_latency_ms=guard_metrics.get("avg_latency_ms", 1.2),
        dsa_metrics={
            "bloom_filter": state.bloom_filter.get_metrics(),
            "trie": state.trie.get_metrics(),
            "scheduler_queue_depth": state.scheduler.size(),
            "scheduler_snapshot": state.scheduler.get_snapshot(limit=5),
            "attack_graph": state.attack_graph.get_metrics(),
            "attack_families": state.attack_graph.get_clusters_summary(),
        },
        attack_vector_distribution=vector_dist
    )

@router.get("/config")
def get_system_config():
    return {
        "target_models": TARGET_MODELS,
        "vector_metadata": VECTOR_METADATA,
    }
