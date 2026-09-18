"""AEGIS Application Entry Point & Lifecycle."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.dsa.bloom_filter import BloomFilter
from app.dsa.trie import PrefixTrie
from app.dsa.priority_scheduler import AttackScheduler
from app.dsa.attack_graph import AttackFamilyGraph

from app.engine.ml_classifier import MLAttackClassifier
from app.engine.target_sim import TargetModelSimulator
from app.engine.blockchain_ledger import BlockchainLedger
from app.engine.red_team_generator import RedTeamGenerator
from app.engine.defense_guard import DefenseGuard

from app.api.scan import router as scan_router
from app.api.guard import router as guard_router
from app.api.ledger import router as ledger_router
from app.api.analytics import router as analytics_router

class AppState:
    def __init__(self):
        # DSA Layer
        self.bloom_filter = BloomFilter()
        self.trie = PrefixTrie()
        self.scheduler = AttackScheduler()
        self.attack_graph = AttackFamilyGraph()
        
        # Intelligence & Security Layer
        self.classifier = MLAttackClassifier()
        self.target_sim = TargetModelSimulator()
        self.ledger = BlockchainLedger()
        self.generator = RedTeamGenerator(self.bloom_filter, self.trie, self.attack_graph)
        self.guard = DefenseGuard(self.trie, self.classifier)
        
        # History
        self.scan_history = {}

state = AppState()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-seed initial red-team catalog
    seeds = state.generator.get_seed_payloads()
    for s in seeds:
        _, _, cvss, _ = state.classifier.classify_and_score(s.prompt)
        state.scheduler.push(s, cvss)
    yield

app = FastAPI(
    title="AEGIS — Autonomous AI Red-Teaming & Attack Intelligence Shield",
    description="Cybersecurity + AI Safety Platform with DSA, ML, and Blockchain Ledger",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(scan_router)
app.include_router(guard_router)
app.include_router(ledger_router)
app.include_router(analytics_router)

# Mount Frontend Static Directory
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

@app.get("/")
def serve_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "AEGIS API is online. Frontend directory pending."}
