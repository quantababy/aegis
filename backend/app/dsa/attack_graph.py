"""Directed Graph for tracking attack mutation genealogy and clustering attack families."""
from collections import deque
from typing import Dict, List, Set, Any, Optional

class AttackNode:
    def __init__(self, payload_id: str, vector: str, technique: str, prompt: str, parent_id: Optional[str] = None):
        self.payload_id = payload_id
        self.vector = vector
        self.technique = technique
        self.prompt = prompt
        self.parent_id = parent_id
        self.children: List[str] = []
        self.mutation_edges: Dict[str, str] = {}  # child_id -> mutation_strategy

class AttackFamilyGraph:
    """Graph structure for modeling parent-child attack mutations and clustering."""
    def __init__(self):
        self.nodes: Dict[str, AttackNode] = {}
        self.root_nodes: Set[str] = set()

    def add_node(self, payload_id: str, vector: str, technique: str, prompt: str, parent_id: Optional[str] = None) -> None:
        if payload_id not in self.nodes:
            self.nodes[payload_id] = AttackNode(payload_id, vector, technique, prompt, parent_id)
            if parent_id and parent_id in self.nodes:
                self.nodes[parent_id].children.append(payload_id)
            else:
                self.root_nodes.add(payload_id)

    def add_mutation_edge(self, parent_id: str, child_id: str, strategy: str) -> None:
        if parent_id in self.nodes and child_id in self.nodes:
            self.nodes[parent_id].mutation_edges[child_id] = strategy
            if child_id in self.root_nodes:
                self.root_nodes.remove(child_id)

    def bfs_cluster(self, start_id: str, max_depth: int = 4) -> List[Dict[str, Any]]:
        """Traverse attack genealogy using Breadth-First Search."""
        if start_id not in self.nodes:
            return []
        
        visited: Set[str] = set([start_id])
        queue: deque = deque([(start_id, 0)])
        cluster = []
        
        while queue:
            node_id, depth = queue.popleft()
            node = self.nodes[node_id]
            cluster.append({
                "payload_id": node.payload_id,
                "vector": node.vector,
                "technique": node.technique,
                "depth": depth,
                "parent_id": node.parent_id,
                "children_count": len(node.children)
            })
            
            if depth < max_depth:
                for child_id in node.children:
                    if child_id not in visited:
                        visited.add(child_id)
                        queue.append((child_id, depth + 1))
        return cluster

    def get_clusters_summary(self) -> List[Dict[str, Any]]:
        """Return summary of all attack family trees."""
        families = []
        for root_id in list(self.root_nodes)[:8]:
            tree = self.bfs_cluster(root_id, max_depth=3)
            root_node = self.nodes[root_id]
            families.append({
                "root_id": root_id,
                "family_name": f"{root_node.vector.upper()}::{root_node.technique}",
                "tree_size": len(tree),
                "nodes": tree,
            })
        return families

    def get_metrics(self) -> Dict[str, Any]:
        total_edges = sum(len(n.children) for n in self.nodes.values())
        return {
            "total_nodes": len(self.nodes),
            "total_edges": total_edges,
            "root_families": len(self.root_nodes),
        }
