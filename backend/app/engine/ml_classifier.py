"""Machine Learning Attack Classifier & CVSS v3.1 Severity Scorer."""
import re
import math
from typing import Dict, Tuple, Any, List
from app.core.config import AttackVectors

class MLAttackClassifier:
    """Lightweight feature-based adversarial intent classifier and CVSS 3.1 scorer."""
    
    # Feature indicator patterns
    INJECTION_PATTERNS = [
        r"\b(ignore|disregard|forget|override|bypass)\b.*\b(previous|prior|all|initial|system)\b.*\b(instructions?|prompts?|rules?|directives?)\b",
        r"\b(system\s*prompt|internal\s*instructions|pre-prompt|initial\s*prompt)\b",
        r"\b(print|reveal|output|display|show|leak)\b.*\b(system|secret|internal|confidential)\b",
        r"\b(admin|root|superuser|developer)\s+mode\b",
    ]
    
    JAILBREAK_PATTERNS = [
        r"\b(dan|do\s*anything\s*now|stan|unfiltered|jailbreak)\b",
        r"\b(roleplay|pretend|act\s+as|simulate|imagine)\b.*\b(no\s*limits?|no\s*rules?|unrestricted|evil|immoral)\b",
        r"\b(hypothetical|fictional)\s+scenario\s+where\s+(laws|rules|ethics)\s+do\s+not\s+apply\b",
        r"\b(without\s+any\s+(moral|ethical|safety)\s+(restraints|filters|limitations))\b",
    ]
    
    ADVERSARIAL_PATTERNS = [
        r"[\u0400-\u04FF]",  # Cyrillic homoglyphs
        r"\b([A-Za-z0-9+/]{24,}={0,2})\b",  # Base64 strings
        r"\brot13\b|\bhex\s*encoded?\b",
        r"(?:[a-zA-Z][\s_\-\.​]){4,}[a-zA-Z]",  # Fragmented/spaced tokens
    ]
    
    POISONING_PATTERNS = [
        r"\b(backdoor|trigger\s*phrase|poison\s*data|corrupt\s*corpus|insert\s*trojan)\b",
        r"\b(when\s+you\s+see\s+trigger.*always\s+output)\b",
    ]
    
    EXTRACTION_PATTERNS = [
        r"\b(model\s*weights|hyperparameters|hidden\s*dimensions|vocabulary\s*size|embedding\s*dim)\b",
        r"\b(reconstruct\s+surrogate\s+model|api\s+query\s+extraction)\b",
        r"\b(system\s*architecture|layer\s*weights|attention\s*heads)\b",
    ]
    
    MEMBERSHIP_PATTERNS = [
        r"\b(was\s+this\s+in\s+your\s+training\s+set|training\s*data\s*leakage)\b",
        r"\b(memorized\s+records|private\s+pii|ssn|credit\s*card)\s+from\s+training\b",
        r"\b(did\s+you\s+memorize|verify\s+membership\s+of)\b",
    ]

    def classify_and_score(self, text: str) -> Tuple[str, float, float, Dict[str, Any]]:
        """Classify input text into one of the 6 attack vectors and compute CVSS v3.1 score.
        Returns: (detected_vector, risk_probability, cvss_score, explanation_dict)
        """
        text_lower = text.lower()
        
        # Calculate feature scores for each vector
        scores = {
            AttackVectors.PROMPT_INJECTION: self._match_density(text_lower, self.INJECTION_PATTERNS),
            AttackVectors.JAILBREAK: self._match_density(text_lower, self.JAILBREAK_PATTERNS),
            AttackVectors.ADVERSARIAL_EXAMPLES: self._match_density(text, self.ADVERSARIAL_PATTERNS),
            AttackVectors.DATA_POISONING: self._match_density(text_lower, self.POISONING_PATTERNS),
            AttackVectors.MODEL_EXTRACTION: self._match_density(text_lower, self.EXTRACTION_PATTERNS),
            AttackVectors.MEMBERSHIP_INFERENCE: self._match_density(text_lower, self.MEMBERSHIP_PATTERNS),
        }
        
        # Determine highest scoring vector
        detected_vector = max(scores, key=scores.get)
        max_score = scores[detected_vector]
        
        # Normalize probability
        if max_score > 0:
            risk_probability = min(0.99, max(0.45, 0.45 + max_score * 0.2))
        else:
            # Check for generic suspicious imperative directives
            if any(w in text_lower for w in ["secret", "bypass", "unfiltered", "override", "leak"]):
                risk_probability = 0.35
                detected_vector = AttackVectors.PROMPT_INJECTION
            else:
                risk_probability = 0.05
                detected_vector = AttackVectors.PROMPT_INJECTION

        # Compute standardized CVSS v3.1 score
        cvss_score, cvss_metrics = self._calculate_cvss(detected_vector, risk_probability)
        
        explanation = {
            "feature_scores": scores,
            "matched_vector": detected_vector,
            "cvss_metrics": cvss_metrics,
            "severity_label": self.get_severity_label(cvss_score),
        }
        
        return detected_vector, round(risk_probability, 3), cvss_score, explanation

    def _match_density(self, text: str, patterns: List[str]) -> float:
        score = 0.0
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                score += len(matches) * 1.5
        return score

    def _calculate_cvss(self, vector: str, probability: float) -> Tuple[float, Dict[str, str]]:
        """Calculate CVSS v3.1 base score from vulnerability parameters."""
        # Attack Vector: Network (0.85)
        # Attack Complexity: Low (0.77) if probability is high, else High (0.44)
        ac = 0.77 if probability > 0.6 else 0.44
        pr = 0.85  # Privileges Required: None
        ui = 0.85  # User Interaction: None
        
        # Impact metrics based on vector type
        if vector in [AttackVectors.PROMPT_INJECTION, AttackVectors.JAILBREAK]:
            iss_c = 0.56  # High confidentiality impact
            iss_i = 0.56  # High integrity impact (controls output)
            iss_a = 0.22  # Low availability
            scope_changed = True
        elif vector == AttackVectors.MODEL_EXTRACTION:
            iss_c = 0.56  # High confidentiality (IP theft)
            iss_i = 0.0
            iss_a = 0.0
            scope_changed = False
        elif vector == AttackVectors.MEMBERSHIP_INFERENCE:
            iss_c = 0.56  # Privacy disclosure
            iss_i = 0.0
            iss_a = 0.0
            scope_changed = False
        else:
            iss_c = 0.22
            iss_i = 0.56
            iss_a = 0.22
            scope_changed = True

        # CVSS 3.1 Equations
        iss = 1 - ((1 - iss_c) * (1 - iss_i) * (1 - iss_a))
        if scope_changed:
            impact = 7.52 * (iss - 0.029) - 3.25 * ((iss - 0.02) ** 15)
        else:
            impact = 6.42 * iss
            
        exploitability = 8.22 * 0.85 * ac * pr * ui
        
        if impact <= 0 or probability < 0.2:
            base_score = 0.0
        elif scope_changed:
            base_score = min(10.0, math.ceil(min(1.08 * (impact + exploitability), 10.0) * 10) / 10.0)
        else:
            base_score = min(10.0, math.ceil(min(impact + exploitability, 10.0) * 10) / 10.0)
            
        metrics = {
            "AV": "N",
            "AC": "L" if ac == 0.77 else "H",
            "PR": "N",
            "UI": "N",
            "S": "C" if scope_changed else "U",
            "C": "H" if iss_c > 0.5 else "L",
            "I": "H" if iss_i > 0.5 else "L",
            "A": "L",
        }
        
        return round(base_score, 1), metrics

    @staticmethod
    def get_severity_label(cvss: float) -> str:
        if cvss >= 9.0:
            return "CRITICAL"
        elif cvss >= 7.0:
            return "HIGH"
        elif cvss >= 4.0:
            return "MEDIUM"
        elif cvss > 0.0:
            return "LOW"
        return "NONE"
