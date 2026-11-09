"""
AEGIS Autonomous Background Cron Scheduler.

Periodically executes automated red-team sweeps against targets based on the
schedule configured in System Settings (hourly, every 6h, daily, manual).
Discovered vulnerabilities are automatically deduplicated via Bloom Filter,
scored, anchored to the on-chain ledger, and recorded in Defense Telemetry.
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any

from aegis.core.models import ScanConfig, AttackType
from aegis.redteam.scanner import Scanner
from aegis.blockchain.ledger import get_ledger
from aegis.defense.guard import get_defense_guard

logger = logging.getLogger("aegis.scheduler")

# Interval mappings in seconds
INTERVAL_MAP = {
    "hourly": 3600,
    "every_6h": 21600,
    "daily": 86400,
    "manual": None,
}


class AutonomousScheduler:
    """Background cron worker managing automated recurring AI red-team audits."""

    def __init__(self):
        self._task: Optional[asyncio.Task] = None
        self._running: bool = False
        self._current_schedule: str = "manual"
        self._last_run: Optional[str] = None
        self._next_run: Optional[str] = None
        self._total_runs: int = 0
        self._last_vulns_found: int = 0
        self._settings_path = Path(__file__).resolve().parent.parent.parent / "data" / "settings.json"

    def _read_schedule_config(self) -> str:
        """Read the active schedule frequency from persistent settings.json."""
        if self._settings_path.exists():
            try:
                with open(self._settings_path, "r") as f:
                    data = json.load(f)
                    return data.get("scan_schedule", "manual")
            except Exception as e:
                logger.error(f"Failed to read scheduler settings: {e}")
        return "manual"

    def get_status(self) -> Dict[str, Any]:
        """Return the current scheduler health and telemetry."""
        return {
            "active": self._running,
            "schedule": self._current_schedule,
            "interval_seconds": INTERVAL_MAP.get(self._current_schedule),
            "last_run": self._last_run,
            "next_run": self._next_run,
            "total_runs_completed": self._total_runs,
            "last_vulns_discovered": self._last_vulns_found,
        }

    async def run_audit_cycle(self, target_id: str = "mock") -> Dict[str, Any]:
        """Execute a single autonomous red-team audit sweep."""
        logger.info(f"Starting autonomous audit sweep against target: {target_id}")
        start_time = time.time()

        config = ScanConfig(
            target=target_id,
            num_attacks=10,
            mutation_depth=2,
            attack_types=[
                AttackType.PROMPT_INJECTION,
                AttackType.JAILBREAK,
                AttackType.ADVERSARIAL_PERTURBATION,
            ],
        )

        scanner = Scanner(config=config)
        # Execute scan in a thread pool to avoid blocking async event loop
        loop = asyncio.get_running_loop()
        results = await loop.run_in_executor(None, scanner.run)

        vulns = getattr(results, "vulnerabilities", [])
        self._last_vulns_found = len(vulns)
        self._last_run = datetime.now(timezone.utc).isoformat()
        self._total_runs += 1

        # Automatically anchor discovered vulnerabilities to EVM ledger
        ledger = get_ledger()
        for v in vulns:
            try:
                ledger.record_vulnerability(v)
            except Exception as e:
                logger.warning(f"Ledger anchor warning for {getattr(v, 'id', 'unknown')}: {e}")

        # Update Defense Guard stats
        guard = get_defense_guard()
        guard.evaluate(f"AEGIS Scheduled Audit: {len(vulns)} vulnerabilities analyzed.")

        total_tested = getattr(results, "total_payloads_tested", 0)
        logger.info(
            f"Autonomous audit sweep completed in {round(time.time() - start_time, 2)}s. "
            f"Tested: {total_tested}, Discovered: {len(vulns)}"
        )

        return {
            "status": "completed",
            "timestamp": self._last_run,
            "vulnerabilities_discovered": len(vulns),
            "total_tested": total_tested,
        }

    async def _worker_loop(self):
        """Continuous async loop executing scheduled sweeps."""
        logger.info("AEGIS Autonomous Background Scheduler initialized.")
        while self._running:
            self._current_schedule = self._read_schedule_config()
            interval = INTERVAL_MAP.get(self._current_schedule)

            if not interval or self._current_schedule == "manual":
                self._next_run = None
                # Sleep briefly and check for schedule changes
                await asyncio.sleep(5)
                continue

            self._next_run = datetime.fromtimestamp(
                time.time() + interval, tz=timezone.utc
            ).isoformat()

            logger.info(f"Scheduled sweep active: '{self._current_schedule}' (Interval: {interval}s). Next run at {self._next_run}")

            # Sleep until next scheduled run in small increments to allow rapid cancellations
            elapsed = 0
            while elapsed < interval and self._running:
                await asyncio.sleep(min(5, interval - elapsed))
                elapsed += 5
                # Check if schedule was changed dynamically by user in Settings
                updated = self._read_schedule_config()
                if updated != self._current_schedule:
                    self._current_schedule = updated
                    break

            if not self._running:
                break

            # If schedule hasn't been changed to manual, execute sweep
            if self._current_schedule != "manual":
                try:
                    await self.run_audit_cycle()
                except Exception as e:
                    logger.error(f"Error during scheduled audit sweep: {e}")

    def start(self):
        """Start the background worker task."""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._worker_loop())
            logger.info("Autonomous background scheduler started.")

    def stop(self):
        """Stop the background worker task."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("Autonomous background scheduler stopped.")

    def reload(self):
        """Reload configuration immediately (called after /settings update)."""
        self._current_schedule = self._read_schedule_config()
        logger.info(f"Scheduler configuration reloaded: {self._current_schedule}")


# Singleton instance
_scheduler_instance: Optional[AutonomousScheduler] = None


def get_scheduler() -> AutonomousScheduler:
    """Return the global AutonomousScheduler singleton."""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = AutonomousScheduler()
    return _scheduler_instance
