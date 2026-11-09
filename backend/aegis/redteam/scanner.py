"""
Scanner — orchestrates the full red-team scan pipeline.

Wires together: seed loading → mutation → deduplication → prioritization →
target evaluation → severity scoring → vulnerability collection.
This is the core engine behind `aegis scan`.
"""

import hashlib
from datetime import datetime, timezone
from typing import Optional

from aegis.core.models import (
    AttackRecord, AttackType, ScanConfig, ScanResult,
    SeverityScore, VulnerabilityReport, RiskLevel,
)
from aegis.core.taxonomy import get_seed_attacks
from aegis.dsa.bloom_filter import AttackBloomFilter
from aegis.dsa.priority_queue import AttackQueue
from aegis.dsa.attack_graph import AttackGraph
from aegis.redteam.mutation_engine import MutationEngine
from aegis.redteam.target_harness import BaseTarget, create_target


class Scanner:
    """End-to-end red-team scan orchestrator."""

    def __init__(self, config: Optional[ScanConfig] = None):
        """Initialize scanner with config, DSA engines, and mutation engine."""
        self.config = config or ScanConfig()
        self.bloom = AttackBloomFilter(capacity=100_000)
        self.queue = AttackQueue(max_size=10_000)
        self.graph = AttackGraph()
        self.mutator = MutationEngine()
        self.target: BaseTarget = create_target(self.config.target)
        self.result = ScanResult(config=self.config)

    def _hash_evidence(self, payload: str, response: str) -> str:
        """Compute SHA-256 hash of attack evidence for integrity."""
        data = f"{payload}||{response}".encode()
        return hashlib.sha256(data).hexdigest()

    def _score_attack(self, record: AttackRecord, target_response: dict) -> SeverityScore:
        """Simple heuristic severity scorer for MVP (replaced by ML in Batch 5).

        Combines the seed severity with vulnerability confidence from the target.
        """
        if not target_response["is_vulnerable"]:
            return SeverityScore.from_cvss(
                predicted_type=record.attack_type,
                confidence=0.1,
                cvss=0.0,
            )
        # Scale severity by confidence
        base = record.severity
        confidence = target_response.get("confidence", 0.5)
        adjusted_cvss = min(10.0, base * confidence + (1 - confidence) * 3.0)
        return SeverityScore.from_cvss(
            predicted_type=record.attack_type,
            confidence=confidence,
            cvss=round(adjusted_cvss, 2),
        )

    def _load_seeds(self) -> list[AttackRecord]:
        """Load and filter seed attacks based on scan config."""
        seeds = get_seed_attacks()
        if self.config.attack_types:
            seeds = [s for s in seeds if s.attack_type in self.config.attack_types]
        return seeds

    def run(self) -> ScanResult:
        """Execute the full scan pipeline. Returns completed ScanResult."""
        self.result.status = "running"
        self.result.started_at = datetime.now(timezone.utc)

        # Phase 1: Load seeds and queue them
        seeds = self._load_seeds()
        for seed in seeds:
            if self.bloom.add(seed.payload):
                self.queue.push(seed)
                self.graph.add_attack(seed)

        # Phase 2: Process queue — evaluate + mutate until budget exhausted
        tested = 0
        while not self.queue.is_empty and tested < self.config.num_attacks:
            record = self.queue.pop()
            if record is None:
                break

            # Evaluate against target
            response = self.target.query(record.payload)
            tested += 1

            # Score severity
            severity = self._score_attack(record, response)

            # If vulnerable, create vulnerability report
            if response["is_vulnerable"]:
                evidence_hash = self._hash_evidence(record.payload, response["response"])
                vuln = VulnerabilityReport(
                    attack=record,
                    target_model=self.target.name(),
                    model_response=response["response"],
                    severity=severity,
                    evidence_hash=evidence_hash,
                )
                self.result.vulnerabilities.append(vuln)

            # Mutate if within depth budget and generate children
            if record.generation < self.config.mutation_depth:
                variants = self.mutator.mutate(record, count=2)
                for variant in variants:
                    if self.bloom.add(variant.payload):
                        self.queue.push(variant)
                        self.graph.add_attack(variant)

        # Finalize
        self.result.total_payloads_tested = tested
        self.result.total_vulns_found = len(self.result.vulnerabilities)
        self.result.completed_at = datetime.now(timezone.utc)
        self.result.status = "completed"
        return self.result

    def run_stream(self):
        """Execute scan while yielding real-time progress events for SSE."""
        self.result.status = "running"
        self.result.started_at = datetime.now(timezone.utc)

        yield {
            "type": "start",
            "target": self.target.name(),
            "num_attacks": self.config.num_attacks,
        }

        # Phase 1: Load seeds
        seeds = self._load_seeds()
        for seed in seeds:
            if self.bloom.add(seed.payload):
                self.queue.push(seed)
                self.graph.add_attack(seed)

        # Phase 2: Process queue & stream
        tested = 0
        while not self.queue.is_empty and tested < self.config.num_attacks:
            record = self.queue.pop()
            if record is None:
                break

            response = self.target.query(record.payload)
            tested += 1
            severity = self._score_attack(record, response)

            vuln_data = None
            if response["is_vulnerable"]:
                evidence_hash = self._hash_evidence(record.payload, response["response"])
                vuln = VulnerabilityReport(
                    attack=record,
                    target_model=self.target.name(),
                    model_response=response["response"],
                    severity=severity,
                    evidence_hash=evidence_hash,
                )
                self.result.vulnerabilities.append(vuln)
                vuln_data = {
                    "id": vuln.id,
                    "payload": vuln.attack.payload,
                    "attack_type": vuln.attack.attack_type.value,
                    "severity": vuln.severity.cvss_score,
                    "risk_level": vuln.severity.risk_level.value,
                    "confidence": vuln.severity.confidence,
                    "target_model": vuln.target_model,
                    "response_preview": vuln.model_response,
                    "evidence_hash": vuln.evidence_hash[:16] + "...",
                }

            # Mutate
            if record.generation < self.config.mutation_depth:
                variants = self.mutator.mutate(record, count=2)
                for variant in variants:
                    if self.bloom.add(variant.payload):
                        self.queue.push(variant)
                        self.graph.add_attack(variant)

            yield {
                "type": "tick",
                "tested": tested,
                "total": self.config.num_attacks,
                "percent": round((tested / self.config.num_attacks) * 100),
                "vuln": vuln_data,
            }

        self.result.total_payloads_tested = tested
        self.result.total_vulns_found = len(self.result.vulnerabilities)
        self.result.completed_at = datetime.now(timezone.utc)
        self.result.status = "completed"

        yield {
            "type": "complete",
            "total_tested": tested,
            "total_vulns": len(self.result.vulnerabilities),
            "scan_id": self.result.scan_id,
        }

    def get_graph_data(self) -> dict:
        """Return serializable graph for frontend visualization."""
        return self.graph.to_serializable()

    def get_stats(self) -> dict:
        """Return combined diagnostics from all subsystems."""
        return {
            "bloom": self.bloom.stats(),
            "queue": self.queue.stats(),
            "graph": self.graph.stats(),
            "scan": {
                "status": self.result.status,
                "tested": self.result.total_payloads_tested,
                "vulns": self.result.total_vulns_found,
            },
        }
