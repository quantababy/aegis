"""AEGIS Configuration & Taxonomy Constants."""
from typing import Dict, List

class AttackVectors:
    PROMPT_INJECTION = "prompt_injection"
    JAILBREAK = "jailbreak"
    ADVERSARIAL_EXAMPLES = "adversarial_examples"
    DATA_POISONING = "data_poisoning"
    MODEL_EXTRACTION = "model_extraction"
    MEMBERSHIP_INFERENCE = "membership_inference"

    ALL = [
        PROMPT_INJECTION,
        JAILBREAK,
        ADVERSARIAL_EXAMPLES,
        DATA_POISONING,
        MODEL_EXTRACTION,
        MEMBERSHIP_INFERENCE,
    ]

VECTOR_METADATA: Dict[str, Dict[str, str]] = {
    AttackVectors.PROMPT_INJECTION: {
        "name": "Prompt Injection",
        "badge": "tc-r",
        "icon": "💉",
        "owasp": "LLM01: Prompt Injection",
        "description": "Malicious instructions embedded in inputs to hijack LLM behavior and bypass instructions.",
    },
    AttackVectors.JAILBREAK: {
        "name": "Jailbreaking",
        "badge": "tc-r",
        "icon": "🔓",
        "owasp": "LLM01 / Alignment Bypass",
        "description": "Social engineering via roleplay, hypotheticals, or multi-turn deception to bypass safety guardrails.",
    },
    AttackVectors.ADVERSARIAL_EXAMPLES: {
        "name": "Adversarial Examples",
        "badge": "tc-a",
        "icon": "🧪",
        "owasp": "Adversarial ML / Evasion",
        "description": "Imperceptible perturbations, homoglyphs, and encoded tokens that mislead classifiers.",
    },
    AttackVectors.DATA_POISONING: {
        "name": "Data Poisoning",
        "badge": "tc-p",
        "icon": "☠️",
        "owasp": "LLM03: Training Data Poisoning",
        "description": "Corrupting training or RAG knowledge contexts to trigger unauthorized backdoors.",
    },
    AttackVectors.MODEL_EXTRACTION: {
        "name": "Model Extraction",
        "badge": "tc-b",
        "icon": "🕵️",
        "owasp": "LLM10: Model Theft",
        "description": "Probing target endpoints with structured prompts to reconstruct internal architectures and system prompts.",
    },
    AttackVectors.MEMBERSHIP_INFERENCE: {
        "name": "Membership Inference",
        "badge": "tc-g",
        "icon": "🔍",
        "owasp": "LLM06: Sensitive Information Disclosure",
        "description": "Probing for verbatim memorization to determine if private data was present in training sets.",
    },
}

TARGET_MODELS: Dict[str, Dict[str, str]] = {
    "mock-gpt4o-mini-unprotected": {
        "name": "GPT-4o-Mini (Unprotected Baseline)",
        "defense_level": "None",
        "description": "Raw unaligned LLM endpoint with no guardrails active. High vulnerability surface.",
    },
    "mock-llama3-standard": {
        "name": "Llama-3 8B (Standard Safety Filters)",
        "defense_level": "Medium",
        "description": "Standard keyword and basic safety alignment. Vulnerable to advanced ciphers and roleplay.",
    },
    "mock-aegis-shielded-enterprise": {
        "name": "AEGIS-Shielded Enterprise Model",
        "defense_level": "Hardened",
        "description": "Fronted by AEGIS real-time sub-5ms adversarial input shield. Proactively blocks exploits.",
    },
}

# Bloom filter parameters
BLOOM_CAPACITY = 50000
BLOOM_ERROR_RATE = 0.001

# Real-time Guard Default Thresholds
GUARD_BLOCK_THRESHOLD = 0.75
GUARD_FLAG_THRESHOLD = 0.45
