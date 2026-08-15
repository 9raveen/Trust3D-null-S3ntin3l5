"""
Generates a sequence of frames over time for each object, moving them
according to their velocity, re-running trust/fusion each frame (so
noise/degradation is re-sampled every frame, not frozen), then applying
a per-object Kalman filter across the sequence to smooth the fused
position trajectory.

This is what /scene/sequence should call. Single-frame /scene is
untouched — this is a separate code path.
"""
import copy

from schema import Frame, FusedObject, SensorObservation, Anomaly, validate_frame
from synthetic_detections import GroundTruthObject, generate_sensor_observations
from trust_engine import compute_trust_scores, detect_anomaly
from fusion import fuse_positions, scene_confidence
from kalman_filter import ConstantVelocityKF2D


def _advance_position(obj: GroundTruthObject, t_index: int, dt: float) -> list[float]:
    """Where this object should be at frame t_index, given its velocity."""
    return [
        obj.position_3d[0] + obj.velocity[0] * t_index * dt,
        obj.position_3d[1] + obj.velocity[1] * t_index * dt,
        obj.position_3d[2],  # z held constant — fine for the MVP
    ]


def build_sequence(
    gt_scene: list[GroundTruthObject],
    scenario: str = "normal",
    n_frames: int = 12,
    dt: float = 0.5,
    seed: int = 42,
) -> list[Frame]:
    import random
    rng = random.Random(seed)

    # one Kalman filter per object, persisted across the whole sequence
    kalman_filters: dict[str, ConstantVelocityKF2D] = {}
    for obj in gt_scene:
        start = _advance_position(obj, 0, dt)
        kalman_filters[obj.object_id] = ConstantVelocityKF2D(
            initial_pos=start, dt=dt,
            process_noise=0.5, measurement_noise=1.2,
        )

    frames = []
    for t in range(n_frames):
        # advance ground-truth positions for this timestep
        advanced_scene = [
            GroundTruthObject(
                object_id=obj.object_id, type=obj.type,
                position_3d=_advance_position(obj, t, dt),
                velocity=obj.velocity,
            )
            for obj in gt_scene
        ]

        frame_seed = seed + t  # different noise draw per frame, still reproducible
        obs_by_obj = generate_sensor_observations(advanced_scene, scenario=scenario, seed=frame_seed)
        frame_rng = random.Random(frame_seed)

        objects = []
        for obj in advanced_scene:
            obs = obs_by_obj[obj.object_id]
            sensor_positions = {
                s: [obj.position_3d[i] + frame_rng.uniform(-0.3, 0.3) for i in range(3)]
                for s in obs
            }
            trust = compute_trust_scores(obs, sensor_positions)
            anomaly_info = detect_anomaly(trust)
            fused_pos = fuse_positions(sensor_positions, trust)
            conf = scene_confidence(trust)

            smoothed = kalman_filters[obj.object_id].step(fused_pos)
            smoothed = [round(v, 3) for v in smoothed]

            objects.append(FusedObject(
                object_id=obj.object_id,
                type=obj.type,
                position_3d=obj.position_3d,
                velocity=obj.velocity,
                sensor_observations={s: SensorObservation(**o) for s, o in obs.items()},
                trust_scores=trust,
                fused_position=fused_pos,
                scene_confidence=conf,
                anomaly=Anomaly(**anomaly_info),
                smoothed_position=smoothed + [obj.position_3d[2]],  # re-attach z
            ))

        frames.append(Frame(frame_id=f"frame_{scenario}_{seed}_t{t}", objects=objects))

    return frames


if __name__ == "__main__":
    from real_demo_objects import REAL_DEMO_OBJECTS

    seq = build_sequence(REAL_DEMO_OBJECTS, scenario="normal", n_frames=8)
    for frame in seq:
        errors = validate_frame(frame.to_dict())
        if errors:
            print(f"{frame.frame_id}: CONTRACT ERRORS {errors}")
            continue
        obj = frame.objects[3]  # 085fb7c4, fast-moving vehicle — motion should be visible
        print(f"{frame.frame_id}: {obj.object_id} fused={obj.fused_position[:2]} smoothed={obj.smoothed_position[:2]}")