"""Max-Heap Priority Queue for scheduling adversarial attacks by severity & exploitability."""
import heapq
from typing import List, Tuple, Dict, Any
from app.core.schemas import AttackPayload

class PrioritizedAttack:
    def __init__(self, priority: float, payload: AttackPayload):
        self.priority = priority
        self.payload = payload

    def __lt__(self, other: "PrioritizedAttack") -> bool:
        # Negative comparison to simulate Max-Heap in Python's min-heap heapq
        return self.priority > other.priority

class AttackScheduler:
    """Orders attacks so highest predicted severity/exploitability runs first."""
    def __init__(self):
        self._heap: List[PrioritizedAttack] = []
        self._counter = 0

    def push(self, payload: AttackPayload, severity_score: float) -> None:
        """Push an attack into the queue with computed priority."""
        # Priority combines complexity, base severity, and novelty
        priority = round(severity_score * (0.6 + 0.4 * payload.complexity), 3)
        heapq.heappush(self._heap, PrioritizedAttack(priority, payload))
        self._counter += 1

    def pop(self) -> Tuple[float, AttackPayload]:
        """Pop the highest priority attack from the queue."""
        if not self._heap:
            raise IndexError("Pop from empty attack scheduler.")
        item = heapq.heappop(self._heap)
        return item.priority, item.payload

    def peek(self) -> Tuple[float, AttackPayload]:
        if not self._heap:
            raise IndexError("Peek into empty attack scheduler.")
        item = self._heap[0]
        return item.priority, item.payload

    def size(self) -> int:
        return len(self._heap)

    def is_empty(self) -> bool:
        return len(self._heap) == 0

    def get_snapshot(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Return top queued items without mutating heap."""
        sorted_copy = sorted(self._heap, key=lambda x: x.priority, reverse=True)
        return [
            {
                "priority": item.priority,
                "payload_id": item.payload.payload_id,
                "vector": item.payload.vector,
                "technique": item.payload.technique,
                "prompt_snippet": item.payload.prompt[:70] + "..." if len(item.payload.prompt) > 70 else item.payload.prompt,
            }
            for item in sorted_copy[:limit]
        ]
