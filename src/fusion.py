"""
Adaptive fusion: combines per-sensor position estimates into one fused
position, weighted by trust — NOT by simply dropping low-trust sensors.
A radar at trust=0.4 still contributes, just less.
"""


def fuse_positions(
    sensor_positions: dict[str, list[float]],
    trust_scores: dict[str, float],
) -> list[float]:
    """Trust-weighted average of each sensor's position estimate for one object."""
    total_weight = sum(trust_scores.get(s, 0.0) for s in sensor_positions)
    if total_weight == 0:
        # all sensors zero trust -> fall back to unweighted average rather than divide by zero
        n = len(sensor_positions)
        return [sum(p[i] for p in sensor_positions.values()) / n for i in range(3)]

    fused = [0.0, 0.0, 0.0]
    for sensor, pos in sensor_positions.items():
        w = trust_scores.get(sensor, 0.0) / total_weight
        for i in range(3):
            fused[i] += w * pos[i]
    return [round(v, 3) for v in fused]


def scene_confidence(trust_scores: dict[str, float]) -> float:
    """Simple aggregate: trust-weighted, order-of-magnitude scene-level confidence."""
    if not trust_scores:
        return 0.0
    return round(sum(trust_scores.values()) / len(trust_scores), 3)


if __name__ == "__main__":
    from synthetic_detections import load_mock_scene, generate_sensor_observations
    from trust_engine import compute_trust_scores, detect_anomaly

    scene = load_mock_scene(seed=42)
    for scenario in ("normal", "camera_degraded", "radar_anomaly"):
        obs_by_obj = generate_sensor_observations(scene, scenario=scenario, seed=1)
        print(f"\n-- {scenario} --")
        for obj in scene:
            obs = obs_by_obj[obj.object_id]
            trust = compute_trust_scores(obs)
            anomaly = detect_anomaly(trust)
            # MVP stand-in: each sensor "sees" the GT position with tiny per-sensor jitter
            sensor_positions = {s: obj.position_3d for s in obs}
            fused = fuse_positions(sensor_positions, trust)
            conf = scene_confidence(trust)
            print(f"{obj.object_id}: fused_pos={fused} scene_conf={conf} anomaly={anomaly}")