"""
The 4 real objects selected from nuScenes-mini for the demo, frozen as
constants. This exists so the LIVE /scene route can serve the same real
data as the /scene/static fixtures, WITHOUT needing nuscenes-devkit or the
dataset present on whatever machine runs the backend during the demo.

Source: v1.0-mini, first sample of first scene, filtered via
nuscenes_loader.select_demo_objects(n=4). Regenerate by re-running that
script and pasting fresh values here if you want a different sample.
"""
from synthetic_detections import GroundTruthObject

REAL_DEMO_OBJECTS = [
    GroundTruthObject(
        object_id="3d036221", type="human",
        position_3d=[-12.656, 1.793, 0.864], velocity=[-1.312, 0.308],
    ),
    GroundTruthObject(
        object_id="d7e840af", type="human",
        position_3d=[-12.706, 3.82, 1.056], velocity=[-0.9, 0.208],
    ),
    GroundTruthObject(
        object_id="e91afa15", type="vehicle",
        position_3d=[16.193, 4.529, 1.893], velocity=[0.018, -0.03],
    ),
    GroundTruthObject(
        object_id="085fb7c4", type="vehicle",
        position_3d=[-18.614, -9.181, 0.615], velocity=[3.975, 8.71],
    ),
]