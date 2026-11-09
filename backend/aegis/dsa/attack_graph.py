"""
Attack Graph — directed graph tracking parent→child mutation lineage.

Uses NetworkX DiGraph to model how seed attacks mutate into variant
families. Supports BFS/DFS traversal for lineage exploration and
serialization for the frontend visualization.
"""

from collections import deque
from typing import Optional

import networkx as nx

from aegis.core.models import AttackRecord


class AttackGraph:
    """Directed acyclic graph of attack mutation lineage."""

    def __init__(self):
        """Initialize an empty attack lineage graph."""
        self._graph = nx.DiGraph()

    def add_attack(self, record: AttackRecord) -> None:
        """Add an attack node. Links to parent if parent_id is set."""
        self._graph.add_node(record.id, **{
            "payload": record.payload,
            "attack_type": record.attack_type.value,
            "severity": record.severity,
            "generation": record.generation,
        })
        if record.parent_id and record.parent_id in self._graph:
            self._graph.add_edge(record.parent_id, record.id)

    def get_children(self, node_id: str) -> list[str]:
        """Return IDs of direct children (mutations) of a node."""
        if node_id not in self._graph:
            return []
        return list(self._graph.successors(node_id))

    def get_parent(self, node_id: str) -> Optional[str]:
        """Return parent ID, or None if this is a seed node."""
        if node_id not in self._graph:
            return None
        parents = list(self._graph.predecessors(node_id))
        return parents[0] if parents else None

    def bfs_from(self, node_id: str) -> list[str]:
        """Breadth-first traversal of the subtree rooted at node_id."""
        if node_id not in self._graph:
            return []
        visited = []
        queue = deque([node_id])
        seen = {node_id}
        while queue:
            current = queue.popleft()
            visited.append(current)
            for child in self._graph.successors(current):
                if child not in seen:
                    seen.add(child)
                    queue.append(child)
        return visited

    def dfs_from(self, node_id: str) -> list[str]:
        """Depth-first traversal of the subtree rooted at node_id."""
        if node_id not in self._graph:
            return []
        visited = []
        stack = [node_id]
        seen = {node_id}
        while stack:
            current = stack.pop()
            visited.append(current)
            for child in reversed(list(self._graph.successors(current))):
                if child not in seen:
                    seen.add(child)
                    stack.append(child)
        return visited

    def get_lineage_to_root(self, node_id: str) -> list[str]:
        """Trace from a node back to its seed root. Returns [node, ..., root]."""
        path = []
        current = node_id
        while current and current in self._graph:
            path.append(current)
            parents = list(self._graph.predecessors(current))
            current = parents[0] if parents else None
        return path

    def get_roots(self) -> list[str]:
        """Return all seed nodes (nodes with no parent)."""
        return [n for n in self._graph.nodes if self._graph.in_degree(n) == 0]

    @property
    def node_count(self) -> int:
        return self._graph.number_of_nodes()

    @property
    def edge_count(self) -> int:
        return self._graph.number_of_edges()

    def to_serializable(self) -> dict:
        """Convert graph to JSON-serializable dict for the frontend."""
        nodes = []
        for nid, data in self._graph.nodes(data=True):
            nodes.append({"id": nid, **data})
        edges = [{"source": u, "target": v} for u, v in self._graph.edges]
        return {"nodes": nodes, "edges": edges}

    def stats(self) -> dict:
        """Return graph diagnostics."""
        roots = self.get_roots()
        return {
            "nodes": self.node_count,
            "edges": self.edge_count,
            "roots": len(roots),
            "max_depth": max(
                (self._graph.nodes[n].get("generation", 0) for n in self._graph.nodes),
                default=0,
            ),
        }
