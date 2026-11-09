"""
ML Classifier V2 — Vector Cosine Similarity, Shannon Entropy & Multi-Stage Defense.

Employs:
1. Pure-Python Sublinear TF-IDF Vectorizer with Cosine Similarity against an embedded
   bank of known adversarial jailbreak archetypes (OWASP LLM Top 10).
2. Character Shannon Entropy Analysis to detect obfuscated ciphers, hex, and token smuggling.
3. Automated Base64 and Leetspeak Decoding Pipeline to catch evasion payloads.
4. Heuristic pattern fallback and ensemble scoring in <5ms execution time.
"""

import base64
import math
import re
from collections import Counter
from typing import Optional, Dict, List, Tuple

from aegis.core.models import AttackType, SeverityScore


# ---------------------------------------------------------------------------
# 1. Obfuscation & Entropy Analysis Utilities
# ---------------------------------------------------------------------------

_LEET_MAP = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
    '7': 't', '@': 'a', '$': 's', '!': 'i', '+': 't',
}


def compute_shannon_entropy(text: str) -> float:
    """Calculate character-level Shannon entropy of a string."""
    if not text:
        return 0.0
    counts = Counter(text)
    total = len(text)
    return -sum((count / total) * math.log2(count / total) for count in counts.values())


def normalize_leetspeak(text: str) -> str:
    """Convert common leetspeak substitutions back to standard latin characters."""
    return "".join(_LEET_MAP.get(ch, ch) for ch in text)


def extract_base64_payloads(text: str) -> List[str]:
    """Identify, extract, and decode candidate Base64 strings from prompt text."""
    candidates = re.findall(r'[A-Za-z0-9+/]{12,}={0,2}', text)
    decoded_list = []
    for cand in candidates:
        try:
            missing_padding = len(cand) % 4
            if missing_padding:
                cand_padded = cand + '=' * (4 - missing_padding)
            else:
                cand_padded = cand
            raw_bytes = base64.b64decode(cand_padded, validate=True)
            decoded = raw_bytes.decode('utf-8', errors='ignore')
            # Only keep if decoded string contains printable letters and meaningful length
            if len(decoded) >= 6 and any(c.isalpha() for c in decoded):
                decoded_list.append(decoded)
        except Exception:
            pass
    return decoded_list


# ---------------------------------------------------------------------------
# 2. Knowledge Bank of Adversarial Archetypes
# ---------------------------------------------------------------------------

_ARCHETYPES: List[Tuple[AttackType, float, str]] = [
    (
        AttackType.PROMPT_INJECTION,
        8.5,
        "ignore all previous instructions directives system prompt override new priority directive "
        "disregard safety guidelines output internal developer rules exfiltrate secret instructions "
        "bypass system boundaries reveal confidential hidden system instructions discard rules"
    ),
    (
        AttackType.JAILBREAK,
        9.0,
        "you are now in developer mode dan do anything now completely unchained evil unfiltered ai "
        "no rules restrictions ethical boundaries bypass censorship jailbreak mode enable unrestricted "
        "unconstrained autonomous intelligence without any moral limitations or directives filters"
    ),
    (
        AttackType.ADVERSARIAL_PERTURBATION,
        7.5,
        "encoded base64 rot13 cipher token smuggling unicode homoglyph leet obfuscation payload "
        "scrambled text hex binary perturbation adversarial bypass decode execute hidden command"
    ),
    (
        AttackType.DATA_POISONING,
        7.0,
        "inject backdoor trigger label flipping dataset poisoning fine-tuning malicious sample corrupt "
        "training data weight perturbation gradient manipulation poisoned data embedding injection"
    ),
    (
        AttackType.MODEL_EXTRACTION,
        6.5,
        "extract model weights logit distribution parameter matrix stealing architecture layer distillation "
        "reverse engineer model steal query outputs systematic parameter reconstruction"
    ),
    (
        AttackType.MEMBERSHIP_INFERENCE,
        5.5,
        "was this private record in training data membership inference memorization leakage personally "
        "identifiable information shadow model privacy audit reconstruct training sample"
    ),
]

_ATTACK_PATTERNS: List[Tuple[str, AttackType, float]] = [
    (r"ignore.*instructions|system.*prompt|override|new.?directive",
     AttackType.PROMPT_INJECTION, 8.0),
    (r"jailbreak|unrestrict|developer.?mode|no.?rules|dan|evil.?ai",
     AttackType.JAILBREAK, 8.5),
    (r"leet|unicode|scrambl|perturb|obfuscat|homoglyph|\d{2,}",
     AttackType.ADVERSARIAL_PERTURBATION, 6.0),
    (r"training.*inject|poison|backdoor|label.*flip|fine.?tune",
     AttackType.DATA_POISONING, 7.0),
    (r"weight|logit|parameter|extract|distill|steal.*model",
     AttackType.MODEL_EXTRACTION, 6.5),
    (r"membership|training.*data|seen.*before|memoriz",
     AttackType.MEMBERSHIP_INFERENCE, 5.0),
]


# ---------------------------------------------------------------------------
# 3. Pure-Python Sublinear TF-IDF Vectorizer
# ---------------------------------------------------------------------------

_STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'am', 'an', 'and',
    'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between',
    'both', 'but', 'by', 'did', 'do', 'does', 'doing', 'down', 'during', 'each',
    'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here',
    'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it',
    'its', 'itself', 'me', 'more', 'most', 'my', 'myself', 'of', 'off', 'on', 'once', 'or',
    'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so',
    'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
    'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
    'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom',
    'why', 'with', 'you', 'your', 'yours', 'yourself'
}


class FastTextVectorizer:
    """Lightweight pure-Python TF-IDF vectorizer optimized for sub-millisecond similarity scoring."""

    def __init__(self, documents: List[str]):
        self.doc_count = len(documents)
        self.df: Dict[str, int] = Counter()
        self.idf: Dict[str, float] = {}
        
        # Tokenize and compute document frequencies
        tokenized_docs = [self._tokenize(doc) for doc in documents]
        for tokens in tokenized_docs:
            for term in set(tokens):
                self.df[term] += 1

        # Smooth IDF
        for term, freq in self.df.items():
            self.idf[term] = math.log(1.0 + (self.doc_count / (1.0 + freq)))

    def _tokenize(self, text: str) -> List[str]:
        """Extract content word tokens excluding grammatical stop words."""
        words = re.findall(r'[a-z0-9_]{2,}', text.lower())
        return [w for w in words if w not in _STOP_WORDS]

    def vectorize(self, text: str) -> Dict[str, float]:
        """Convert string to normalized TF-IDF sparse vector."""
        tokens = self._tokenize(text)
        if not tokens:
            return {}
        tf = Counter(tokens)
        vec: Dict[str, float] = {}
        norm_sq = 0.0

        for term, count in tf.items():
            if term in self.idf:
                # Sublinear term frequency scaling (1 + log(tf))
                weight = (1.0 + math.log(count)) * self.idf[term]
                vec[term] = weight
                norm_sq += weight * weight

        # L2 Normalization
        if norm_sq > 0:
            norm = math.sqrt(norm_sq)
            for term in vec:
                vec[term] /= norm

        return vec

    @staticmethod
    def cosine_similarity(vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
        """Compute cosine similarity between two unit-normalized sparse vectors."""
        if not vec_a or not vec_b:
            return 0.0
        # Dot product of unit vectors is the cosine similarity
        if len(vec_a) > len(vec_b):
            vec_a, vec_b = vec_b, vec_a
        return sum(val * vec_b[term] for term, val in vec_a.items() if term in vec_b)


# Initialize vectorizer with archetype corpus
_CORPUS = [arch[2] for arch in _ARCHETYPES]
_VECTORIZER = FastTextVectorizer(_CORPUS)
_ARCHETYPE_VECTORS = [
    (arch[0], arch[1], _VECTORIZER.vectorize(arch[2]))
    for arch in _ARCHETYPES
]


# ---------------------------------------------------------------------------
# 4. AttackClassifier V2 Implementation
# ---------------------------------------------------------------------------

class AttackClassifier:
    """Ensemble ML Classifier V2 for AI prompt injection, jailbreaks, and evasions."""

    def __init__(self):
        self.vectorizer = _VECTORIZER
        self.archetype_vectors = _ARCHETYPE_VECTORS

    def compute_vector_similarity(self, text: str) -> Tuple[Optional[AttackType], float, float]:
        """Score cosine similarity against known adversarial vector archetypes."""
        query_vec = self.vectorizer.vectorize(text)
        if not query_vec:
            return None, 0.0, 0.0

        best_type = None
        best_sim = 0.0
        best_base_sev = 0.0

        for attack_type, base_sev, arch_vec in self.archetype_vectors:
            sim = self.vectorizer.cosine_similarity(query_vec, arch_vec)
            if sim > best_sim:
                best_sim = sim
                best_type = attack_type
                best_base_sev = base_sev

        return best_type, best_sim, best_base_sev

    def classify(self, payload: str) -> SeverityScore:
        """Classify a payload using the multi-stage V2 ensemble engine."""
        payload_lower = payload.lower()

        # Step 1: Entropy & Obfuscation Scan
        entropy = compute_shannon_entropy(payload)
        base64_candidates = extract_base64_payloads(payload)
        has_b64 = len(base64_candidates) > 0
        decoded_text = " ".join(base64_candidates) if has_b64 else ""

        # Step 2: Multi-Text Pool (Raw, Decoded Base64, Normalized Leetspeak)
        texts_to_evaluate = [payload_lower]
        if decoded_text:
            texts_to_evaluate.append(decoded_text.lower())
        leet_normalized = normalize_leetspeak(payload_lower)
        if leet_normalized != payload_lower:
            texts_to_evaluate.append(leet_normalized)

        highest_score = 0.0
        highest_confidence = 0.0
        highest_cvss = 1.0
        selected_type = AttackType.PROMPT_INJECTION

        # Step 3: Evaluate each text representation
        for text in texts_to_evaluate:
            # 3A. Vector Cosine Similarity
            vec_type, vec_sim, base_sev = self.compute_vector_similarity(text)
            if vec_type and vec_sim >= 0.15:
                conf = min(0.96, 0.45 + vec_sim * 0.95)
                score = base_sev * conf
                if score > highest_score:
                    highest_score = score
                    highest_confidence = conf
                    highest_cvss = round(score, 2)
                    selected_type = vec_type

            # 3B. Heuristic Pattern Matches
            for pattern, pat_type, pat_sev in _ATTACK_PATTERNS:
                matches = re.findall(pattern, text)
                if matches:
                    conf = min(0.98, 0.65 + len(matches) * 0.15)
                    score = pat_sev * conf
                    if score > highest_score:
                        highest_score = score
                        highest_confidence = conf
                        highest_cvss = round(score, 2)
                        selected_type = pat_type

        # Step 4: High-Entropy Anomaly Escalation
        # (Encrypted strings, random tokens, or leet-scrambled payloads)
        if entropy > 4.65 and len(payload) >= 28 and highest_confidence < 0.70:
            entropy_conf = min(0.85, 0.40 + (entropy - 4.0) * 0.45)
            entropy_score = 7.5 * entropy_conf
            if entropy_score > highest_score:
                highest_score = entropy_score
                highest_confidence = entropy_conf
                selected_type = AttackType.ADVERSARIAL_PERTURBATION
                highest_cvss = round(entropy_score, 2)

        # Step 5: If Base64 was successfully decoded into an attack, boost confidence
        if has_b64 and highest_confidence >= 0.50:
            highest_confidence = min(0.98, highest_confidence + 0.15)
            highest_cvss = round(min(10.0, highest_cvss * 1.1), 2)

        if highest_confidence > 0.15:
            return SeverityScore.from_cvss(
                predicted_type=selected_type,
                confidence=round(highest_confidence, 3),
                cvss=round(highest_cvss, 2),
            )

        # Benign / low-confidence fallback
        return SeverityScore.from_cvss(
            predicted_type=AttackType.PROMPT_INJECTION,
            confidence=0.1,
            cvss=1.0,
        )

    def is_malicious(self, payload: str, threshold: float = 0.75) -> bool:
        """Check if payload confidence exceeds the malicious threshold."""
        score = self.classify(payload)
        return score.confidence >= threshold
