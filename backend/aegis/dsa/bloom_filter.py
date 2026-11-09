"""
Bloom Filter — probabilistic set membership for O(1) attack deduplication.

Uses multiple hash functions over a fixed-size bit array. Guarantees zero
false negatives (if we say "not seen", it truly hasn't been seen). Accepts
a tunable false positive rate controlled by array size and hash count.
"""

import hashlib
import math
from typing import Optional


class AttackBloomFilter:
    """Deduplicate attack payloads in O(1) time and O(m) space."""

    def __init__(self, capacity: int = 100_000, fp_rate: float = 0.001):
        """Initialize filter sized for `capacity` items at `fp_rate` false-positive rate."""
        self.capacity = capacity
        self.fp_rate = fp_rate
        # Optimal bit array size: m = -(n * ln(p)) / (ln(2)^2)
        self.size = self._optimal_size(capacity, fp_rate)
        # Optimal hash count: k = (m/n) * ln(2)
        self.hash_count = self._optimal_hash_count(self.size, capacity)
        self.bit_array = bytearray(self.size)
        self._count = 0

    @staticmethod
    def _optimal_size(n: int, p: float) -> int:
        """Calculate optimal bit array size for n items at false-positive rate p."""
        m = -(n * math.log(p)) / (math.log(2) ** 2)
        return max(int(m), 64)

    @staticmethod
    def _optimal_hash_count(m: int, n: int) -> int:
        """Calculate optimal number of hash functions."""
        k = (m / max(n, 1)) * math.log(2)
        return max(int(k), 1)

    def _get_hashes(self, payload: str) -> list[int]:
        """Generate `hash_count` independent hash positions for a payload."""
        hashes = []
        for i in range(self.hash_count):
            # Use SHA-256 with seed suffix for independent hashes
            digest = hashlib.sha256(f"{payload}:{i}".encode()).hexdigest()
            hashes.append(int(digest, 16) % self.size)
        return hashes

    def add(self, payload: str) -> bool:
        """Add a payload to the filter. Returns True if it was new (probably)."""
        was_new = not self.contains(payload)
        for pos in self._get_hashes(payload):
            self.bit_array[pos] = 1
        if was_new:
            self._count += 1
        return was_new

    def contains(self, payload: str) -> bool:
        """Check if payload was previously added. No false negatives."""
        return all(self.bit_array[pos] == 1 for pos in self._get_hashes(payload))

    @property
    def count(self) -> int:
        """Number of unique items added."""
        return self._count

    @property
    def utilization(self) -> float:
        """Fraction of capacity used (0.0 to 1.0)."""
        return self._count / self.capacity if self.capacity > 0 else 0.0

    def stats(self) -> dict:
        """Return filter diagnostics for monitoring."""
        bits_set = sum(self.bit_array)
        return {
            "capacity": self.capacity,
            "count": self._count,
            "utilization": round(self.utilization, 4),
            "size_bits": self.size,
            "hash_count": self.hash_count,
            "bits_set": bits_set,
            "fill_ratio": round(bits_set / self.size, 4) if self.size else 0,
        }
