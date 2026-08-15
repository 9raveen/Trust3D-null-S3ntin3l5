"""
Generates per-sensor 'detections' from ground-truth objects instead of
running real inference. This is the scope cut that makes 24h feasible —
see the build plan doc, section 0.

Swap point for real nuScenes-mini:
    Replace `load_mock_scene()` with a function that pulls annotated
    objects for a sample token via the nuscenes-devkit, e.g.:

        from nuscenes.nuscenes import NuScenes
        nusc = NuScenes(version='v1.0-mini', dataroot='/data/sets/nuscenes')
        sample = nusc.get('sample', sample_token)
        for ann_token in sample['anns']:
            ann = nusc.get('sample_annotation', ann_token)
            # ann['translation'] -> position_3d (needs ego-frame transform,
            # see alignment.py), ann['category_name'] -> type, etc.

    Everything downstream (this file's output shape) stays the same —
    only load_mock_scene() needs replacing.
"""
import random
from dataclasses import dataclass


@dataclass
class GroundTruthObject:
    object_id: str
    type: str
    position_3d: list  # [x, y, z], already in ego/world frame
    velocity: list      # [vx, vy]


def load_mock_scene(n_objects: int = 3, seed: int | None = None) -> list[GroundTruthObject]:
    """Stand-in for a nuScenes sample until you have the real dataset wired in."""
    rng = random.Random(seed)
    types = ["vehicle", "pedestrian", "vehicle"]
    objs = []
    for i in range(n_objects):
        objs.append(GroundTruthObject(
            object_id=f"obj_{i}",
            type=types[i % len(types)],
            position_3d=[rng.uniform(-20, 20), rng.uniform(0, 40), 0.0],
            velocity=[rng.uniform(-5, 5), rng.uniform(-5, 5)],
        ))
    return objs


def generate_sensor_observations(
    gt_objects: list[GroundTruthObject],
    scenario: str = "normal",
    seed: int | None = None,
) -> dict:
    """
    For each GT object, fabricate per-sensor confidence + health that a
    real perception pipeline would have produced — then apply the chosen
    corruption scenario. This is Track A's half of what the corruption
    simulator needs; Track B's simulator (in the FastAPI layer) calls the
    same scenario names so the two stay in sync.

    scenario: "normal" | "camera_degraded" | "radar_anomaly"
    """
    rng = random.Random(seed)
    result = {}
    for obj in gt_objects:
        obs = {
            "camera": {"confidence": round(rng.uniform(0.85, 0.97), 2), "health": 1.0},
            "lidar":  {"confidence": round(rng.uniform(0.88, 0.98), 2), "health": 1.0},
            "radar":  {"confidence": round(rng.uniform(0.80, 0.93), 2), "health": 1.0},
        }
        if scenario == "camera_degraded":
            obs["camera"]["confidence"] = round(rng.uniform(0.40, 0.60), 2)
            obs["camera"]["health"] = 0.5
        elif scenario == "radar_anomaly":
            obs["radar"]["confidence"] = round(rng.uniform(0.30, 0.45), 2)
            obs["radar"]["health"] = 0.6
        result[obj.object_id] = obs
    return result


if __name__ == "__main__":
    scene = load_mock_scene(seed=42)
    for scenario in ("normal", "camera_degraded", "radar_anomaly"):
        print(f"\n-- {scenario} --")
        obs = generate_sensor_observations(scene, scenario=scenario, seed=1)
        for oid, o in obs.items():
            print(oid, o)