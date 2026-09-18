"""Blockchain Vulnerability Ledger API Endpoints."""
from typing import List
from fastapi import APIRouter
from app.core.schemas import VulnerabilityBlock, LedgerVerifyResponse

router = APIRouter(prefix="/api/ledger", tags=["Blockchain Vulnerability Ledger"])

@router.get("/blocks", response_model=List[VulnerabilityBlock])
def get_ledger_blocks(limit: int = 50):
    """Retrieve immutable vulnerability blocks from the ledger."""
    from app.main import state
    return state.ledger.get_blocks(limit=limit)

@router.post("/verify", response_model=LedgerVerifyResponse)
def verify_blockchain():
    """Cryptographically verifies block hashes, Merkle roots, and prev_hash linkage."""
    from app.main import state
    return state.ledger.verify_chain_integrity()
