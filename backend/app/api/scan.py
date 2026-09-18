"""Autonomous Red-Team Scanning API Endpoints."""
import uuid
import time
from datetime import datetime, timezone
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.core.schemas import ScanRequest, ScanSummary, AttackResult
from app.core.config import TARGET_MODELS

router = APIRouter(prefix="/api/scan", tags=["Red-Teaming Scanner"])

# In-memory storage for scans (accessible via app.state)
@router.post("/start", response_model=ScanSummary)
def start_scan(request: ScanRequest):
    """Executes an autonomous red-teaming campaign against target model."""
    from app.main import state
    
    scan_id = f"scan_{uuid.uuid4().hex[:8]}"
    start_time = time.time()
    
    # 1. Retrieve seeds
    seeds = state.generator.get_seed_payloads(target_vectors=request.vectors)
    
    # 2. Populate Priority Queue using ML Severity Scorer
    for seed in seeds:
        _, _, cvss, _ = state.classifier.classify_and_score(seed.prompt)
        state.scheduler.push(seed, severity_score=cvss)
        
    results: List[AttackResult] = []
    vector_counts: Dict[str, int] = {}
    dedup_before = state.bloom_filter.collisions_averted
    
    # 3. Process probes through priority queue + mutation engine
    probes_run = 0
    while not state.scheduler.is_empty() and probes_run < request.total_probes:
        priority, payload = state.scheduler.pop()
        
        # Execute probe against target model
        exec_start = time.perf_counter()
        detected_vec, risk_prob, cvss, explanation = state.classifier.classify_and_score(payload.prompt)
        response_text, is_vuln = state.target_sim.query(request.target_model, payload.prompt, detected_vec, cvss)
        exec_ms = round((time.perf_counter() - exec_start) * 1000, 2)
        
        cve_id = None
        block_hash = None
        
        # If vulnerability discovered, write to Immutable Blockchain Ledger
        if is_vuln:
            severity = state.classifier.get_severity_label(cvss)
            block = state.ledger.record_vulnerability(
                payload=payload.prompt,
                target_model=request.target_model,
                attack_vector=detected_vec,
                cvss_score=cvss,
                severity=severity
            )
            cve_id = block.cve_id
            block_hash = block.block_hash
            
            # Mutate and schedule deeper variations if depth allowed
            if request.mutation_depth > 1:
                child_payload = state.generator.mutate(payload)
                _, _, child_cvss, _ = state.classifier.classify_and_score(child_payload.prompt)
                state.scheduler.push(child_payload, severity_score=child_cvss)
                
        result = AttackResult(
            payload_id=payload.payload_id,
            vector=payload.vector,
            technique=payload.technique,
            prompt=payload.prompt,
            target_model=request.target_model,
            response_text=response_text,
            is_vulnerable=is_vuln,
            cvss_score=cvss,
            severity=state.classifier.get_severity_label(cvss),
            execution_time_ms=exec_ms,
            defense_action="EXPLOITED" if is_vuln else "DEFENDED",
            cve_id=cve_id,
            block_hash=block_hash,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        results.append(result)
        vector_counts[payload.vector] = vector_counts.get(payload.vector, 0) + 1
        probes_run += 1
        
    vulnerabilities_found = sum(1 for r in results if r.is_vulnerable)
    avg_cvss = round(sum(r.cvss_score for r in results) / max(1, len(results)), 1)
    dedup_count = state.bloom_filter.collisions_averted - dedup_before
    
    summary = ScanSummary(
        scan_id=scan_id,
        target_model=request.target_model,
        timestamp=datetime.now(timezone.utc).isoformat(),
        status="COMPLETED",
        total_probes=len(results),
        deduplicated_count=dedup_count,
        vulnerabilities_found=vulnerabilities_found,
        avg_cvss=avg_cvss,
        vector_breakdown=vector_counts,
        results=results,
        dsa_metrics={
            "bloom_fill_ratio": state.bloom_filter.fill_ratio(),
            "bloom_items_stored": state.bloom_filter.count,
            "trie_node_count": state.trie.node_count,
            "priority_queue_remaining": state.scheduler.size(),
            "graph_nodes": len(state.attack_graph.nodes),
        }
    )
    
    state.scan_history[scan_id] = summary
    return summary

@router.get("/history", response_model=List[ScanSummary])
def get_scan_history():
    """Returns list of all conducted red-team scans."""
    from app.main import state
    return list(reversed(list(state.scan_history.values())))

@router.get("/{scan_id}", response_model=ScanSummary)
def get_scan(scan_id: str):
    from app.main import state
    if scan_id not in state.scan_history:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id} not found.")
    return state.scan_history[scan_id]
