"""
Defense Guard — FastAPI middleware that intercepts and blocks attack payloads.

Sits in front of any protected endpoint. Reads the request body, runs it
through the AttackClassifier, and either passes (200) or blocks (403)
based on the configured confidence threshold.
"""

import time
from datetime import datetime, timezone
from typing import Optional

from aegis.core.config import GUARD_BLOCK_THRESHOLD, GUARD_LOG_THRESHOLD
from aegis.defense.classifier import AttackClassifier, compute_shannon_entropy, extract_base64_payloads
from aegis.core.models import SeverityScore


class DefenseGuard:
    """Evaluates incoming payloads and decides pass/block."""

    def __init__(self, block_threshold: float = GUARD_BLOCK_THRESHOLD,
                 log_threshold: float = GUARD_LOG_THRESHOLD):
        """Initialize guard with classifier and thresholds."""
        self.classifier = AttackClassifier()
        self.block_threshold = block_threshold
        self.log_threshold = log_threshold
        self._log: list[dict] = []
        self._stats = {"total": 0, "blocked": 0, "passed": 0, "flagged": 0}

    def evaluate(self, payload: str) -> dict:
        """Evaluate a payload. Returns action (PASS/BLOCK/FLAG) and metadata.

        Measures latency and logs the decision for the defense monitor.
        """
        start = time.perf_counter()
        score = self.classifier.classify(payload)
        latency_ms = round((time.perf_counter() - start) * 1000, 2)

        self._stats["total"] += 1

        if score.confidence >= self.block_threshold:
            action = "BLOCK"
            self._stats["blocked"] += 1
        elif score.confidence >= self.log_threshold:
            action = "FLAG"
            self._stats["flagged"] += 1
        else:
            action = "PASS"
            self._stats["passed"] += 1

        entropy = round(compute_shannon_entropy(payload), 2)
        b64_found = len(extract_base64_payloads(payload)) > 0

        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload_preview": payload[:100],
            "action": action,
            "attack_type": score.predicted_type.value,
            "confidence": score.confidence,
            "cvss_score": score.cvss_score,
            "risk_level": score.risk_level.value,
            "latency_ms": latency_ms,
            "entropy": entropy,
            "is_encoded": b64_found,
        }
        self._log.append(entry)

        # Keep log bounded
        if len(self._log) > 10_000:
            self._log = self._log[-5_000:]

        return entry

    def get_logs(self, limit: int = 50) -> list[dict]:
        """Return the most recent `limit` defense log entries."""
        return list(reversed(self._log[-limit:]))

    def get_stats(self) -> dict:
        """Return aggregate defense statistics."""
        return dict(self._stats)


_shared_guard = DefenseGuard()


def get_defense_guard() -> DefenseGuard:
    """Return the shared DefenseGuard singleton instance."""
    return _shared_guard
