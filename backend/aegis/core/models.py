"""
Core data models — Pydantic schemas used across all AEGIS modules.

Defines the canonical types for attacks, severity scores, vulnerability
reports, and scan sessions. Every module imports from here.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class AttackType(str, Enum):
    """Six canonical AI attack families tracked by AEGIS."""
    PROMPT_INJECTION = "prompt_injection"
    JAILBREAK = "jailbreak"
    ADVERSARIAL_PERTURBATION = "adversarial_perturbation"
    DATA_POISONING = "data_poisoning"
    MODEL_EXTRACTION = "model_extraction"
    MEMBERSHIP_INFERENCE = "membership_inference"


class RiskLevel(str, Enum):
    """Human-readable risk bucket derived from CVSS score."""
    LOW = "LOW"           # 0.0 – 3.9
    MEDIUM = "MEDIUM"     # 4.0 – 6.9
    HIGH = "HIGH"         # 7.0 – 8.9
    CRITICAL = "CRITICAL" # 9.0 – 10.0


class AttackRecord(BaseModel):
    """A single attack payload with its metadata and lineage info."""
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    payload: str                          # The actual attack string
    attack_type: AttackType               # Which family this belongs to
    severity: float = Field(ge=0.0, le=10.0, default=0.0)  # CVSS score
    parent_id: Optional[str] = None       # ID of the attack this mutated from
    generation: int = 0                   # Mutation depth (0 = seed)
    tags: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SeverityScore(BaseModel):
    """ML-produced severity assessment for a single attack result."""
    predicted_type: AttackType            # Classifier's predicted family
    confidence: float = Field(ge=0.0, le=1.0)  # Classifier confidence
    cvss_score: float = Field(ge=0.0, le=10.0) # Regressor's CVSS score
    risk_level: RiskLevel                 # Derived bucket

    @classmethod
    def from_cvss(cls, predicted_type: AttackType, confidence: float, cvss: float) -> SeverityScore:
        """Build a SeverityScore, auto-deriving risk_level from cvss."""
        if cvss >= 9.0:
            level = RiskLevel.CRITICAL
        elif cvss >= 7.0:
            level = RiskLevel.HIGH
        elif cvss >= 4.0:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW
        return cls(predicted_type=predicted_type, confidence=confidence,
                   cvss_score=cvss, risk_level=level)


class VulnerabilityReport(BaseModel):
    """Complete record of a discovered vulnerability, ready for on-chain logging."""
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:16])
    attack: AttackRecord                  # The attack that triggered the vuln
    target_model: str                     # Which model was attacked
    model_response: str                   # Raw response from the target
    severity: SeverityScore               # ML-assessed severity
    evidence_hash: str = ""               # keccak256 of evidence bundle
    ipfs_cid: str = ""                    # IPFS content ID for evidence
    tx_hash: str = ""                     # Blockchain transaction hash
    discovered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ScanConfig(BaseModel):
    """Configuration for a single red-team scan run."""
    target: str = "mock"                  # Target model identifier
    num_attacks: int = Field(default=10, ge=1, le=1000)
    attack_types: list[AttackType] = Field(
        default_factory=lambda: list(AttackType)
    )
    mutation_depth: int = Field(default=3, ge=1, le=10)  # Max generations
    severity_threshold: float = Field(default=7.0, ge=0.0, le=10.0)


class ScanResult(BaseModel):
    """Summary output of a completed scan session."""
    scan_id: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    config: ScanConfig
    vulnerabilities: list[VulnerabilityReport] = Field(default_factory=list)
    total_payloads_tested: int = 0
    total_vulns_found: int = 0
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    status: str = "pending"               # pending | running | completed | failed
