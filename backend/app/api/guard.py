"""Real-Time Defense Guard API Endpoints."""
from fastapi import APIRouter
from app.core.schemas import GuardInspectRequest, GuardEvaluation

router = APIRouter(prefix="/api/guard", tags=["Real-Time Defense Shield"])

@router.post("/inspect", response_model=GuardEvaluation)
def inspect_prompt(request: GuardInspectRequest):
    """Real-time evaluation of an incoming prompt through the sub-5ms defense shield."""
    from app.main import state
    evaluation = state.guard.inspect(request.prompt, sensitivity=request.sensitivity)
    return evaluation

@router.get("/metrics")
def guard_metrics():
    """Returns real-time shield performance metrics."""
    from app.main import state
    return state.guard.get_metrics()
