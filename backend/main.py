from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware



# Add src/ to Python's import path so pipeline.py can import
# schema.py, trust_engine.py, fusion.py, etc.
ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"

if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from pipeline import build_frame
from real_demo_objects import REAL_DEMO_OBJECTS


app = FastAPI(
    title="TRUST3D API",
    description="Trust-Aware 3D Situational Awareness",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


SUPPORTED_SCENARIOS = {
    "normal",
    "camera_degraded",
    "radar_anomaly",
}


@app.get("/scene")
def get_scene(
    scenario: str = Query(default="normal")
):
    if scenario not in SUPPORTED_SCENARIOS:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Unsupported scenario",
                "supported_scenarios": sorted(SUPPORTED_SCENARIOS),
            },
        )

    return build_frame(
    scenario=scenario,
    gt_scene=REAL_DEMO_OBJECTS,
).to_dict()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "trust3d-backend",
    }