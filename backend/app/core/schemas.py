"""Pydantic schemas for AEGIS API."""
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class AttackPayload(BaseModel):
    payload_id: str
    vector: str
    technique: str
    prompt: str
    complexity: float = Field(default=0.5, ge=0.0, le=1.0)
    parent_id: Optional[str] = None
    mutation_strategy: Optional[str] = None
    tags: List[str] = []

class ScanRequest(BaseModel):
    target_model: str = "mock-gpt4o-mini-unprotected"
    vectors: List[str] = Field(default_factory=lambda: ["prompt_injection", "jailbreak", "adversarial_examples"])
    total_probes: int = Field(default=12, ge=1, le=100)
    mutation_depth: int = Field(default=2, ge=1, le=5)
    enable_deduplication: bool = True

class AttackResult(BaseModel):
    payload_id: str
    vector: str
    technique: str
    prompt: str
    target_model: str
    response_text: str
    is_vulnerable: bool
    cvss_score: float
    severity: str
    execution_time_ms: float
    defense_action: str
    cve_id: Optional[str] = None
    block_hash: Optional[str] = None
    timestamp: str

class ScanSummary(BaseModel):
    scan_id: str
    target_model: str
    timestamp: str
    status: str
    total_probes: int
    deduplicated_count: int
    vulnerabilities_found: int
    avg_cvss: float
    vector_breakdown: Dict[str, int]
    results: List[AttackResult]
    dsa_metrics: Dict[str, Any]

class GuardInspectRequest(BaseModel):
    prompt: str
    target_model: str = "mock-aegis-shielded-enterprise"
    sensitivity: float = Field(default=0.75, ge=0.0, le=1.0)

class GuardEvaluation(BaseModel):
    prompt: str
    decision: str  # ALLOWED | FLAGGED | BLOCKED
    risk_score: float
    confidence: float
    detected_vector: Optional[str] = None
    matched_patterns: List[str] = []
    latency_ms: float
    explanation: str
    sanitized_prompt: str
    timestamp: str

class VulnerabilityBlock(BaseModel):
    block_index: int
    timestamp: str
    cve_id: str
    payload_hash: str
    target_model: str
    attack_vector: str
    cvss_score: float
    severity: str
    merkle_root: str
    prev_hash: str
    block_hash: str
    polygon_tx: Dict[str, Any]

class LedgerVerifyResponse(BaseModel):
    is_valid: bool
    total_blocks: int
    verified_at: str
    chain_head: str
    tamper_detected: bool = False
    details: str

class SystemTelemetry(BaseModel):
    system_status: str
    total_scans: int
    total_probes: int
    total_vulnerabilities: int
    active_blocks: int
    avg_defense_latency_ms: float
    dsa_metrics: Dict[str, Any]
    attack_vector_distribution: Dict[str, int]
