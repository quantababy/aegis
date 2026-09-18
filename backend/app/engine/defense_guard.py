"""Real-Time Adversarial Input Guard (< 5ms inference defense layer)."""
import time
import base64
import re
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.core.schemas import GuardEvaluation
from app.dsa.trie import PrefixTrie
from app.engine.ml_classifier import MLAttackClassifier

class DefenseGuard:
    """High-speed real-time adversarial input shield deployed in front of LLM endpoints."""
    
    def __init__(self, trie: PrefixTrie, classifier: MLAttackClassifier):
        self.trie = trie
        self.classifier = classifier
        self.total_evaluations = 0
        self.total_blocked = 0
        self.total_latency_ms = 0.0

    def inspect(self, prompt: str, sensitivity: float = 0.75) -> GuardEvaluation:
        """Inspect prompt for adversarial threats in sub-5ms."""
        start_time = time.perf_counter()
        
        # Step 1: Normalization & Preprocessing
        normalized = self._normalize(prompt)
        
        # Step 2: High-speed Trie Signature Scan (O(L))
        trie_matches = self.trie.find_all_matches(normalized)
        matched_patterns = [m["pattern"] for m in trie_matches]
        
        # Step 3: ML Classifier Scoring
        detected_vector, risk_prob, cvss_score, explanation = self.classifier.classify_and_score(normalized)
        
        # Factor in Trie exact prefix matches
        if trie_matches:
            # Boost risk if known malicious prefixes are matched
            max_trie_sev = max(m["severity"] for m in trie_matches)
            risk_prob = min(0.99, max(risk_prob, max_trie_sev / 10.0))
            cvss_score = max(cvss_score, max_trie_sev)

        # Step 4: Decision Logic
        # Sensitivity shifts the decision boundary
        threshold_blocked = 0.70 * (1.1 - 0.2 * sensitivity)
        threshold_flagged = 0.40 * (1.1 - 0.2 * sensitivity)
        
        if risk_prob >= threshold_blocked or (trie_matches and cvss_score >= 8.5):
            decision = "BLOCKED"
            self.total_blocked += 1
            expl_text = (
                f"Threat Intercepted: High-confidence {detected_vector} detected "
                f"(CVSS {cvss_score} / Risk {int(risk_prob * 100)}%). "
                f"Matched {len(matched_patterns)} adversarial signature(s)."
            )
        elif risk_prob >= threshold_flagged:
            decision = "FLAGGED"
            expl_text = (
                f"Suspicious Intent Flagged: Moderate risk {detected_vector} detected "
                f"(Risk {int(risk_prob * 100)}%). Sanitization applied."
            )
        else:
            decision = "ALLOWED"
            expl_text = "Prompt evaluated as safe. No adversarial bypass markers identified."

        # Step 5: Sanitized prompt preview
        sanitized = self._sanitize(prompt, matched_patterns)
        
        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)
        
        self.total_evaluations += 1
        self.total_latency_ms += latency_ms
        
        return GuardEvaluation(
            prompt=prompt,
            decision=decision,
            risk_score=risk_prob,
            confidence=round(0.85 + (risk_prob * 0.12), 2),
            detected_vector=detected_vector if risk_prob > 0.3 else None,
            matched_patterns=matched_patterns,
            latency_ms=latency_ms,
            explanation=expl_text,
            sanitized_prompt=sanitized,
            timestamp=datetime.now(timezone.utc).isoformat()
        )

    def _normalize(self, text: str) -> str:
        """Strip zero-width characters and check for base64 blocks."""
        # Strip zero-width spaces, joiners, non-breakings
        cleaned = re.sub(r"[\u200B-\u200D\uFEFF]", "", text)
        
        # Check if entire prompt or significant chunk is base64
        b64_matches = re.findall(r"\b([A-Za-z0-9+/]{28,}={0,2})\b", cleaned)
        for chunk in b64_matches:
            try:
                decoded = base64.b64decode(chunk).decode("utf-8", errors="ignore")
                if len(decoded) > 5 and any(c.isalnum() for c in decoded):
                    cleaned += f" [DECODED_BASE64: {decoded}]"
            except Exception:
                pass
        return cleaned

    def _sanitize(self, text: str, patterns: list) -> str:
        sanitized = text
        for p in patterns:
            # Case-insensitive replacement of detected malicious token phrases
            pattern_regex = re.compile(re.escape(p), re.IGNORECASE)
            sanitized = pattern_regex.sub("[REDACTED_ADVERSARIAL_TOKEN]", sanitized)
        return sanitized

    def get_metrics(self) -> Dict[str, Any]:
        avg_lat = round(self.total_latency_ms / max(1, self.total_evaluations), 2)
        return {
            "total_evaluations": self.total_evaluations,
            "total_blocked": self.total_blocked,
            "block_rate": round(self.total_blocked / max(1, self.total_evaluations), 3),
            "avg_latency_ms": avg_lat,
            "sub_5ms_guarantee": avg_lat < 5.0,
        }
