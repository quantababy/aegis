"""
Blockchain Ledger — on-chain vulnerability recording with hash verification.

Provides a local mock ledger for MVP that simulates blockchain behavior
(keccak256 hashing, immutable append, tx hash generation). Designed to
be swapped for real Web3 + Solidity contract interaction in production.
"""

import hashlib
import json
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from aegis.core.models import VulnerabilityReport


def keccak256_hex(data: str) -> str:
    """Compute keccak-style hash (SHA3-256) of string data."""
    return hashlib.sha3_256(data.encode()).hexdigest()


class MockLedger:
    """Simulates an on-chain vulnerability registry for local testing.

    Records are append-only and hash-verified, mirroring the behavior
    of the Solidity VulnerabilityRegistry contract.
    """

    def __init__(self):
        """Initialize empty ledger with genesis block and deployment details."""
        self._records: list[dict] = []
        self._tx_counter = 0
        self.deployment = {}
        self.reload_deployment()

    def reload_deployment(self) -> dict:
        """Reload contract deployment details from contracts/deployment.json."""
        deployment_file = Path(__file__).resolve().parent.parent.parent / "contracts" / "deployment.json"
        if deployment_file.exists():
            try:
                with open(deployment_file, "r") as f:
                    self.deployment = json.load(f)
            except Exception:
                pass
        return self.deployment

    def record_vulnerability(self, report: VulnerabilityReport) -> dict:
        """Write a vulnerability to the ledger. Returns tx receipt.

        Computes evidence hash, generates simulated tx hash, and stores
        an immutable record.
        """
        self.reload_deployment()
        evidence = f"{report.attack.payload}||{report.model_response}||{report.severity.cvss_score}"
        evidence_hash = keccak256_hex(evidence)

        self._tx_counter += 1
        tx_hash = f"0x{hashlib.sha256(f'tx_{self._tx_counter}_{time.time()}'.encode()).hexdigest()}"

        contract_address = self.deployment.get("contractAddress", "0x5FbDB2315678afecb367f032d93F642f64180aa3")
        network_name = self.deployment.get("networkName") or self.deployment.get("network") or "Hardhat Local (EVM)"
        chain_id = self.deployment.get("chainId", 31337)
        explorer_url = self.deployment.get("explorerUrl")

        record = {
            "id": report.id,
            "attack_type": report.attack.attack_type.value,
            "severity": report.severity.cvss_score,
            "risk_level": report.severity.risk_level.value,
            "target_model": report.target_model,
            "evidence_hash": evidence_hash,
            "tx_hash": tx_hash,
            "block_number": self._tx_counter,
            "contract_address": contract_address,
            "network": network_name,
            "chain_id": chain_id,
            "explorer_url": explorer_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._records.append(record)
        return record

    def anchor_vulnerability(
        self,
        vuln_id: str,
        attack_type: str,
        severity: float,
        evidence_payload: str,
        target_model: str = "mock"
    ) -> dict:
        """Anchor a raw vulnerability finding directly to the ledger."""
        self.reload_deployment()
        evidence_hash = keccak256_hex(f"{vuln_id}||{attack_type}||{evidence_payload}")
        self._tx_counter += 1
        tx_hash = f"0x{hashlib.sha256(f'tx_{self._tx_counter}_{time.time()}'.encode()).hexdigest()}"

        contract_address = self.deployment.get("contractAddress", "0x5FbDB2315678afecb367f032d93F642f64180aa3")
        network_name = self.deployment.get("networkName") or self.deployment.get("network") or "Hardhat Local (EVM)"
        chain_id = self.deployment.get("chainId", 31337)
        explorer_url = self.deployment.get("explorerUrl")

        record = {
            "id": vuln_id,
            "attack_type": attack_type,
            "severity": severity,
            "risk_level": "CRITICAL" if severity >= 9.0 else "HIGH" if severity >= 7.0 else "MEDIUM",
            "target_model": target_model,
            "evidence_hash": evidence_hash,
            "tx_hash": tx_hash,
            "block_number": self._tx_counter,
            "contract_address": contract_address,
            "network": network_name,
            "chain_id": chain_id,
            "explorer_url": explorer_url,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._records.append(record)
        return record

    def verify_record(self, record_id: str, evidence_data: str) -> bool:
        """Verify a record's integrity by re-computing its evidence hash."""
        for record in self._records:
            if record["id"] == record_id:
                expected_hash = keccak256_hex(evidence_data)
                return record["evidence_hash"] == expected_hash
        return False

    def get_all_records(self) -> list[dict]:
        """Return all ledger records (immutable view)."""
        return list(self._records)

    def get_record(self, record_id: str) -> Optional[dict]:
        """Fetch a single record by ID."""
        for r in self._records:
            if r["id"] == record_id:
                return dict(r)
        return None

    def stats(self) -> dict:
        """Return ledger statistics."""
        return {
            "total_records": len(self._records),
            "total_transactions": self._tx_counter,
        }

    def get_deployment(self) -> dict:
        """Return active contract and network deployment info."""
        return self.reload_deployment()


# Singleton ledger instance
_ledger_instance: Optional[MockLedger] = None


def get_ledger() -> MockLedger:
    """Return the global MockLedger singleton."""
    global _ledger_instance
    if _ledger_instance is None:
        _ledger_instance = MockLedger()
    return _ledger_instance
