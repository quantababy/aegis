"""
Priority Queue — max-heap ordering attacks by predicted severity.

Wraps Python's heapq (min-heap) with negated priorities to get max-heap
behavior. Highest-severity attacks are always dequeued first so the
red-team agent focuses on the most dangerous vectors.
"""

import heapq
from dataclasses import dataclass, field
from typing import Optional

from aegis.core.models import AttackRecord


@dataclass(order=True)
class _PriorityItem:
    """Internal wrapper for heap ordering. Higher severity = higher priority."""
    priority: float                                  # Negated severity for max-heap
    insert_order: int                                # Tie-breaker (FIFO)
    record: AttackRecord = field(compare=False)      # The actual payload


class AttackQueue:
    """Max-heap priority queue for attack scheduling."""

    def __init__(self, max_size: int = 10_000):
        """Initialize empty queue with a capacity limit."""
        self._heap: list[_PriorityItem] = []
        self._max_size = max_size
        self._counter = 0

    def push(self, record: AttackRecord) -> bool:
        """Add an attack record, ordered by severity (highest first).

        Returns False if queue is at capacity and record was dropped.
        """
        if len(self._heap) >= self._max_size:
            return False
        item = _PriorityItem(
            priority=-record.severity,    # Negate for max-heap via min-heap
            insert_order=self._counter,
            record=record,
        )
        heapq.heappush(self._heap, item)
        self._counter += 1
        return True

    def pop(self) -> Optional[AttackRecord]:
        """Remove and return the highest-severity attack. None if empty."""
        if not self._heap:
            return None
        return heapq.heappop(self._heap).record

    def peek(self) -> Optional[AttackRecord]:
        """View the highest-severity attack without removing it."""
        if not self._heap:
            return None
        return self._heap[0].record

    @property
    def size(self) -> int:
        """Current number of items in the queue."""
        return len(self._heap)

    @property
    def is_empty(self) -> bool:
        return len(self._heap) == 0

    def drain(self, limit: int = -1) -> list[AttackRecord]:
        """Pop up to `limit` items in priority order. -1 means drain all."""
        results = []
        count = 0
        while self._heap and (limit < 0 or count < limit):
            results.append(self.pop())
            count += 1
        return results

    def stats(self) -> dict:
        """Return queue diagnostics."""
        return {
            "size": self.size,
            "max_size": self._max_size,
            "utilization": round(self.size / self._max_size, 4) if self._max_size else 0,
            "top_severity": -self._heap[0].priority if self._heap else 0.0,
        }
