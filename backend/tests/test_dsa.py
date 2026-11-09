"""
Tests for DSA module — Bloom filter, Priority Queue, Attack Graph.

Verifies correctness of deduplication, priority ordering, graph traversal,
and capacity bounds.
"""

import pytest
from aegis.core.models import AttackRecord, AttackType
from aegis.dsa.bloom_filter import AttackBloomFilter
from aegis.dsa.priority_queue import AttackQueue
from aegis.dsa.attack_graph import AttackGraph


# --- Helpers ---

def _make_record(payload: str = "test", severity: float = 5.0,
                 parent_id=None, generation: int = 0, id_: str = None) -> AttackRecord:
    """Shorthand for creating test attack records."""
    rec = AttackRecord(
        payload=payload, attack_type=AttackType.JAILBREAK,
        severity=severity, parent_id=parent_id, generation=generation,
    )
    if id_:
        rec.id = id_
    return rec


# === Bloom Filter ===

class TestBloomFilter:

    def test_add_and_contains(self):
        bf = AttackBloomFilter(capacity=1000)
        assert bf.add("payload_1") is True   # New
        assert bf.contains("payload_1") is True
        assert bf.contains("payload_2") is False

    def test_duplicate_detection(self):
        bf = AttackBloomFilter(capacity=1000)
        bf.add("dup")
        assert bf.add("dup") is False        # Already seen

    def test_zero_false_negatives(self):
        """Every added item must always be found — the core guarantee."""
        bf = AttackBloomFilter(capacity=10_000)
        items = [f"attack_{i}" for i in range(500)]
        for item in items:
            bf.add(item)
        for item in items:
            assert bf.contains(item), f"False negative for {item}"

    def test_count_tracks_unique(self):
        bf = AttackBloomFilter(capacity=1000)
        bf.add("a")
        bf.add("b")
        bf.add("a")  # Duplicate
        assert bf.count == 2

    def test_stats_returns_dict(self):
        bf = AttackBloomFilter(capacity=100)
        bf.add("x")
        s = bf.stats()
        assert s["count"] == 1
        assert s["capacity"] == 100
        assert "fill_ratio" in s


# === Priority Queue ===

class TestPriorityQueue:

    def test_pop_highest_severity_first(self):
        q = AttackQueue(max_size=100)
        q.push(_make_record(severity=3.0))
        q.push(_make_record(severity=9.0))
        q.push(_make_record(severity=6.0))
        assert q.pop().severity == 9.0
        assert q.pop().severity == 6.0
        assert q.pop().severity == 3.0

    def test_empty_pop_returns_none(self):
        q = AttackQueue()
        assert q.pop() is None

    def test_peek_does_not_remove(self):
        q = AttackQueue()
        q.push(_make_record(severity=7.0))
        assert q.peek().severity == 7.0
        assert q.size == 1

    def test_capacity_limit(self):
        q = AttackQueue(max_size=3)
        for i in range(5):
            q.push(_make_record(severity=float(i)))
        assert q.size == 3

    def test_drain_returns_sorted(self):
        q = AttackQueue()
        for s in [2.0, 8.0, 5.0, 1.0]:
            q.push(_make_record(severity=s))
        drained = q.drain()
        severities = [r.severity for r in drained]
        assert severities == [8.0, 5.0, 2.0, 1.0]

    def test_drain_with_limit(self):
        q = AttackQueue()
        for i in range(10):
            q.push(_make_record(severity=float(i)))
        drained = q.drain(limit=3)
        assert len(drained) == 3
        assert q.size == 7

    def test_fifo_tiebreaker(self):
        """Equal severity items dequeue in insertion order."""
        q = AttackQueue()
        r1 = _make_record(payload="first", severity=5.0)
        r2 = _make_record(payload="second", severity=5.0)
        q.push(r1)
        q.push(r2)
        assert q.pop().payload == "first"
        assert q.pop().payload == "second"

    def test_large_scale_ordering(self):
        """Verify correct ordering with 1000+ items."""
        q = AttackQueue(max_size=2000)
        import random
        severities = [random.uniform(0, 10) for _ in range(1000)]
        for s in severities:
            q.push(_make_record(severity=round(s, 2)))
        prev = float('inf')
        while not q.is_empty:
            cur = q.pop().severity
            assert cur <= prev
            prev = cur


# === Attack Graph ===

class TestAttackGraph:

    def _build_sample_graph(self) -> AttackGraph:
        """Build: root -> child1 -> grandchild, root -> child2"""
        g = AttackGraph()
        g.add_attack(_make_record(id_="root", generation=0))
        g.add_attack(_make_record(id_="child1", parent_id="root", generation=1))
        g.add_attack(_make_record(id_="child2", parent_id="root", generation=1))
        g.add_attack(_make_record(id_="grandchild", parent_id="child1", generation=2))
        return g

    def test_add_and_count(self):
        g = self._build_sample_graph()
        assert g.node_count == 4
        assert g.edge_count == 3

    def test_get_children(self):
        g = self._build_sample_graph()
        children = g.get_children("root")
        assert set(children) == {"child1", "child2"}

    def test_get_parent(self):
        g = self._build_sample_graph()
        assert g.get_parent("child1") == "root"
        assert g.get_parent("root") is None

    def test_bfs_from_root(self):
        g = self._build_sample_graph()
        bfs = g.bfs_from("root")
        assert bfs[0] == "root"
        assert set(bfs) == {"root", "child1", "child2", "grandchild"}

    def test_dfs_from_root(self):
        g = self._build_sample_graph()
        dfs = g.dfs_from("root")
        assert dfs[0] == "root"
        assert set(dfs) == {"root", "child1", "child2", "grandchild"}

    def test_lineage_to_root(self):
        g = self._build_sample_graph()
        path = g.get_lineage_to_root("grandchild")
        assert path == ["grandchild", "child1", "root"]

    def test_get_roots(self):
        g = self._build_sample_graph()
        assert g.get_roots() == ["root"]

    def test_to_serializable(self):
        g = self._build_sample_graph()
        data = g.to_serializable()
        assert len(data["nodes"]) == 4
        assert len(data["edges"]) == 3

    def test_nonexistent_node(self):
        g = AttackGraph()
        assert g.get_children("nope") == []
        assert g.bfs_from("nope") == []
        assert g.get_parent("nope") is None
