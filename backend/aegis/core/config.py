"""
Centralized configuration — paths, thresholds, and constants.

Single source of truth for tunable parameters across all AEGIS modules.
"""

from pathlib import Path


# --- Paths ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # backend/
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"
VECTOR_STORE_DIR = DATA_DIR / "vector_store"

# --- Bloom Filter ---
BLOOM_FILTER_SIZE = 100_000        # Bit array size
BLOOM_FILTER_HASH_COUNT = 7        # Number of hash functions

# --- Attack Queue ---
MAX_QUEUE_SIZE = 10_000            # Max pending attacks in priority queue

# --- Red-Team Agent ---
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
RAG_TOP_K = 5                     # Number of similar attacks to retrieve
MUTATION_TEMPERATURE = 0.8        # LLM creativity for mutation
MAX_MUTATION_DEPTH = 5            # Max generations of mutation

# --- ML Classifier ---
SEVERITY_THRESHOLD = 0.75         # Confidence threshold for blocking
CLASSIFIER_MAX_LENGTH = 256       # Max token length for classifier input

# --- Defense Guard ---
GUARD_BLOCK_THRESHOLD = 0.75      # Score above this = block (HTTP 403)
GUARD_LOG_THRESHOLD = 0.5         # Score above this = log but allow

# --- Blockchain ---
CONTRACT_NAME = "VulnerabilityRegistry"
DEFAULT_CHAIN_ID = 31337          # Hardhat local network

# --- API ---
API_HOST = "0.0.0.0"
API_PORT = 8000
CORS_ORIGINS = ["http://localhost:5173"]
