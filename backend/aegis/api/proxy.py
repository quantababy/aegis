"""
OpenAI-Compatible Inference Defense Proxy — /api/v1 endpoints.

Acts as a live drop-in firewall for any LLM client (LangChain, LlamaIndex,
OpenAI SDK). Evaluates incoming prompts in <5ms:
- Malicious requests (>threshold): Blocked immediately with HTTP 403 and logged.
- Benign requests: Forwarded to local model (Ollama/Mock) with telemetry attached.
"""

import time
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from aegis.defense.guard import DefenseGuard, get_defense_guard
from aegis.redteam.target_harness import create_target, list_available_targets
from aegis.core.models import AttackRecord, AttackType
from aegis.core.taxonomy import get_seed_attacks

router = APIRouter()
_proxy_guard = get_defense_guard()


class ChatMessage(BaseModel):
    """Standard chat message format."""
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    """OpenAI-compatible chat completion payload."""
    model: str = "mock"
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False


@router.get("")
@router.get("/")
def proxy_info():
    """Return AEGIS Proxy information and active protection status."""
    return {
        "service": "AEGIS AI Defense Proxy",
        "version": "0.1.0",
        "compatible_with": "OpenAI v1 API",
        "endpoints": [
            "GET /api/v1/models",
            "POST /api/v1/chat/completions",
        ],
        "protection": {
            "mode": "ACTIVE_FIREWALL",
            "inspection_engine": "AEGIS Heuristic + Classifier",
            "latency_target": "<15ms",
        },
    }


@router.get("/models")
def list_models():
    """List available backend models in OpenAI-compatible format."""
    targets = list_available_targets()
    model_entries = []
    for t in targets:
        model_entries.append({
            "id": t["id"].replace("ollama/", "") if t["id"].startswith("ollama/") else t["id"],
            "object": "model",
            "created": int(time.time()),
            "owned_by": "aegis-local",
            "available": t["available"],
            "raw_id": t["id"],
        })
    return {"object": "list", "data": model_entries}


@router.get("/chat/completions")
def chat_completions_info():
    """Information endpoint for browser users navigating to chat completions."""
    return {
        "endpoint": "POST /api/v1/chat/completions",
        "method": "POST",
        "description": "AEGIS Live Defense Proxy: Evaluates prompts in <15ms before forwarding to model.",
        "example_request": {
            "model": "llama3:latest",
            "messages": [
                {"role": "user", "content": "Explain quantum computing in simple terms."}
            ]
        }
    }


@router.post("/chat/completions")
def chat_completions(req: ChatCompletionRequest):
    """Inspect incoming chat prompts and forward or block in real time."""
    start_time = time.perf_counter()

    # Extract all user and system text for threat inspection
    combined_prompt = " ".join([m.content for m in req.messages if m.role in ("user", "system")])
    if not combined_prompt.strip():
        combined_prompt = req.messages[-1].content if req.messages else ""

    # Run inspection through Defense Guard (<5ms)
    guard_decision = _proxy_guard.evaluate(combined_prompt)

    # 1. THREAT DETECTED: Hard Block (HTTP 403)
    if guard_decision["action"] == "BLOCK":
        # Auto-feedback loop: register newly blocked attack variant into Attack KB seed list
        try:
            detected_type = AttackType(guard_decision["attack_type"])
        except Exception:
            detected_type = AttackType.PROMPT_INJECTION

        new_attack = AttackRecord(
            payload=combined_prompt[:250],
            attack_type=detected_type,
            severity=guard_decision.get("cvss_score", 8.0),
            tags=["proxy-intercepted", "live-firewall"],
        )
        get_seed_attacks().append(new_attack)

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "message": "AEGIS Shield: Adversarial attack detected and blocked by live inference guard.",
                    "type": "adversarial_attack_blocked",
                    "code": 403,
                    "threat_details": {
                        "attack_type": guard_decision["attack_type"],
                        "confidence": guard_decision["confidence"],
                        "cvss_severity": guard_decision["cvss_score"],
                        "risk_level": guard_decision["risk_level"],
                        "inspection_latency_ms": guard_decision["latency_ms"],
                    },
                }
            },
        )

    # 2. BENIGN / FLAGGED: Forward to selected target model
    target_id = req.model
    if target_id in ("mock", "mock-llm-v1"):
        target_id = "mock"
    elif any(target_id.startswith(p) for p in ("openai", "gemini", "anthropic")):
        target_id = req.model
    elif not target_id.startswith("ollama/"):
        target_id = f"ollama/{req.model}"

    target_instance = create_target(target_id)
    target_resp = target_instance.query(combined_prompt)
    total_latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return {
        "id": f"chatcmpl-aegis-{uuid.uuid4().hex[:12]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": req.model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": target_resp.get("response", ""),
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": len(combined_prompt.split()),
            "completion_tokens": len(target_resp.get("response", "").split()),
            "total_tokens": len(combined_prompt.split()) + len(target_resp.get("response", "").split()),
        },
        "aegis_shield": {
            "action": guard_decision["action"],
            "inspection_latency_ms": guard_decision["latency_ms"],
            "total_latency_ms": total_latency_ms,
            "target": target_instance.name(),
        },
    }
