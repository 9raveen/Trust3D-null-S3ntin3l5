# TRUST3D

Trust-Aware 3D Situational Awareness — Infinity Hacks 2026, Team NullS3ntin3l5.

## Repo layout
- `src/schema.py` — shared JSON contract between Track A and Track B. **Do not change without telling your teammate.**
- `src/synthetic_detections.py` — GT-based mock detections (swap-in point for real nuScenes-mini, see docstring)
- `src/trust_engine.py` — sensor trust scoring + anomaly detection
- `src/fusion.py` — trust-weighted adaptive fusion
- `src/pipeline.py` — wires it all together; **this is what Track B's FastAPI imports**

## Quick start
```
python3 src/pipeline.py
```
Runs all 3 scenarios (normal / camera_degraded / radar_anomaly) and validates
each frame against the shared contract.

## For Track B
```python
from pipeline import build_frame
frame = build_frame(scenario="radar_anomaly")  # or "normal", "camera_degraded"
return frame.to_dict()
```
