"""Custom BitArray Bloom Filter for O(1) deduplication of attack variants."""
import math
import hashlib
from typing import Dict, Any

class BloomFilter:
    """Space-efficient probabilistic data structure for set membership.
    Guarantees no false negatives; false positive probability bounded by p.
    """
    def __init__(self, expected_elements: int = 50000, false_positive_rate: float = 0.001):
        self.expected_elements = max(100, expected_elements)
        self.target_p = false_positive_rate
        
        # Calculate optimal size (m) and optimal number of hash functions (k)
        # m = - (n * ln(p)) / (ln(2)^2)
        # k = (m / n) * ln(2)
        self.bit_size = int(- (self.expected_elements * math.log(self.target_p)) / (math.log(2) ** 2))
        self.num_hashes = max(1, int((self.bit_size / self.expected_elements) * math.log(2)))
        
        # Byte array for bit storage
        self.byte_size = (self.bit_size + 7) // 8
        self.bit_array = bytearray(self.byte_size)
        self.count = 0
        self.collisions_averted = 0

    def _hashes(self, item: str):
        """Generate k distinct bit indices using double hashing (Kirsch-Mitzenmacher technique).
        hash_i = (hash1 + i * hash2) % bit_size
        """
        encoded = item.strip().lower().encode("utf-8")
        h1 = int(hashlib.sha256(b"salt1_" + encoded).hexdigest(), 16)
        h2 = int(hashlib.md5(b"salt2_" + encoded).hexdigest(), 16)
        
        for i in range(self.num_hashes):
            yield (h1 + i * h2) % self.bit_size

    def add(self, item: str) -> None:
        """Add an attack payload string to the Bloom Filter."""
        for bit_index in self._hashes(item):
            byte_idx = bit_index // 8
            bit_offset = bit_index % 8
            self.bit_array[byte_idx] |= (1 << bit_offset)
        self.count += 1

    def contains(self, item: str) -> bool:
        """Query whether the item is probably in the filter."""
        for bit_index in self._hashes(item):
            byte_idx = bit_index // 8
            bit_offset = bit_index % 8
            if not (self.bit_array[byte_idx] & (1 << bit_offset)):
                return False
        return True

    def record_collision_averted(self) -> None:
        self.collisions_averted += 1

    def get_set_bits_count(self) -> int:
        """Return total number of bits set to 1."""
        return sum(bin(byte).count("1") for byte in self.bit_array)

    def fill_ratio(self) -> float:
        """Current saturation of the bit array."""
        set_bits = self.get_set_bits_count()
        return round(set_bits / self.bit_size, 4)

    def current_false_positive_probability(self) -> float:
        """Compute live false positive probability based on current saturation."""
        # p ≈ (1 - exp(-k * n / m))^k
        exponent = - (self.num_hashes * self.count) / max(1, self.bit_size)
        p = (1.0 - math.exp(exponent)) ** self.num_hashes
        return round(p, 6)

    def get_metrics(self) -> Dict[str, Any]:
        return {
            "bit_size": self.bit_size,
            "byte_size_kb": round(self.byte_size / 1024, 2),
            "num_hashes": self.num_hashes,
            "items_added": self.count,
            "fill_ratio": self.fill_ratio(),
            "target_fp_rate": self.target_p,
            "estimated_fp_rate": self.current_false_positive_probability(),
            "collisions_averted": self.collisions_averted,
        }
