"""
End-to-end Track A pipeline: GT scene -> synthetic detections -> trust
scores -> adaptive fusion -> Frame matching schema.py's contract.

This is what Track B's FastAPI endpoint should import and call:

    from pipeline import build_frame
    frame = build_frame(scenario="radar_anomaly")
    return frame.to_dict()
"""
import random

from schema import Frame, FusedObject, SensorObservation, Anomaly, validate_frame
from synthetic_detections import load_mock_scene, generate_sensor_observations
from trust_engine import compute_trust_scores, detect_anomaly
from fusion import fuse_positions, scene_confidence


def build_frame(
    scenario: str = "normal",
    n_objects: int = 3,
    seed: int = 42,
    gt_scene: list | None = None,
) -> Frame:
    """
    gt_scene: pass a list[GroundTruthObject] from nuscenes_loader.load_real_scene()
        to use real data instead of the mock generator. Leave None for mock.
    """
    if gt_scene is None:
        gt_scene = load_mock_scene(n_objects=n_objects, seed=seed)
    obs_by_obj = generate_sensor_observations(gt_scene, scenario=scenario, seed=seed)

    rng = random.Random(seed)
    objects = []
    for gt in gt_scene:
        obs = obs_by_obj[gt.object_id]

        # small per-sensor position jitter so fused position visibly shifts
        # with trust — replace with real per-sensor estimates once wired to
        # actual nuScenes multi-modal data
        sensor_positions = {
            s: [gt.position_3d[i] + rng.uniform(-0.3, 0.3) for i in range(3)]
            for s in obs
        }

        trust = compute_trust_scores(obs, sensor_positions)
        anomaly_info = detect_anomaly(trust)
        fused_pos = fuse_positions(sensor_positions, trust)
        conf = scene_confidence(trust)

        objects.append(FusedObject(
            object_id=gt.object_id,
            type=gt.type,
            position_3d=gt.position_3d,
            velocity=gt.velocity,
            sensor_observations={s: SensorObservation(**o) for s, o in obs.items()},
            trust_scores=trust,
            fused_position=fused_pos,
            scene_confidence=conf,
            anomaly=Anomaly(**anomaly_info),
        ))

    return Frame(frame_id=f"frame_{scenario}_{seed}", objects=objects)


if __name__ == "__main__":
    import json

    for scenario in ("normal", "camera_degraded", "radar_anomaly"):
        frame = build_frame(scenario=scenario)
        d = frame.to_dict()
        errors = validate_frame(d)
        print(f"\n== {scenario} == contract errors: {errors or 'none'}")
        print(json.dumps(d, indent=2)[:600], "...")