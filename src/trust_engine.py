"""
Trust engine: turns raw per-sensor confidence/health + cross-sensor
agreement into a 0-1 trust score per sensor per object.

trust(sensor) = w1*confidence + w2*health + w3*agreement - w4*anomaly_penalty

This is a hand-written weighted sum, deliberately not a learned model —
that's the correct scope for a 24h MVP (the deck itself calls the full
learned trust model a "full project" item, not hackathon scope).
"""
import math

WEIGHTS = {"confidence": 0.45, "health": 0.25, "agreement": 0.30}
ANOMALY_THRESHOLD = 0.25  # trust gap vs. other sensors above this -> anomaly flag


def _position_agreement(pos_a: list[float], pos_b: list[float]) -> float:
    """1.0 = identical positions, decays toward 0 as they diverge. Simple, explainable."""
    dist = math.dist(pos_a[:2], pos_b[:2])  # BEV distance, ignore z for the MVP
    return max(0.0, 1.0 - dist / 10.0)  # 10m divergence -> zero agreement


def compute_cross_sensor_agreement(
    positions: dict[str, list[float]],
) -> dict[str, float]:
    """
    For each sensor, agreement = average pairwise position agreement with
    the OTHER sensors observing the same object. A sensor that disagrees
    with both others gets a low score even if its own confidence is high.
    """
    sensors = list(positions.keys())
    agreement = {}
    for s in sensors:
        others = [o for o in sensors if o != s]
        if not others:
            agreement[s] = 1.0
            continue
        scores = [_position_agreement(positions[s], positions[o]) for o in others]
        agreement[s] = sum(scores) / len(scores)
    return agreement


def compute_trust_scores(
    sensor_observations: dict[str, dict],
    sensor_positions: dict[str, list[float]] | None = None,
) -> dict[str, float]:
    """
    sensor_observations: {"camera": {"confidence":.., "health":..}, "lidar": {...}, "radar": {...}}
    sensor_positions: optional per-sensor position estimate for the same object,
        used for cross-sensor agreement. If omitted, agreement defaults to 1.0
        (useful for MVP stage where you haven't wired real per-sensor positions yet).
    """
    agreement = (
        compute_cross_sensor_agreement(sensor_positions)
        if sensor_positions
        else {s: 1.0 for s in sensor_observations}
    )

    trust = {}
    for sensor, obs in sensor_observations.items():
        score = (
            WEIGHTS["confidence"] * obs["confidence"]
            + WEIGHTS["health"] * obs["health"]
            + WEIGHTS["agreement"] * agreement.get(sensor, 1.0)
        )
        trust[sensor] = round(min(1.0, max(0.0, score)), 3)
    return trust


def detect_anomaly(trust_scores: dict[str, float]) -> dict:
    """Flag the weakest sensor if it's meaningfully below the others."""
    if not trust_scores:
        return {"flag": False, "sensor": None, "reason": None}
    worst_sensor = min(trust_scores, key=trust_scores.get)
    worst = trust_scores[worst_sensor]
    others_avg = sum(v for k, v in trust_scores.items() if k != worst_sensor) / max(
        1, len(trust_scores) - 1
    )
    if others_avg - worst > ANOMALY_THRESHOLD:
        return {
            "flag": True,
            "sensor": worst_sensor,
            "reason": f"{worst_sensor}_trust_significantly_below_other_sensors",
        }
    return {"flag": False, "sensor": None, "reason": None}


if __name__ == "__main__":
    from synthetic_detections import load_mock_scene, generate_sensor_observations

    scene = load_mock_scene(seed=42)
    for scenario in ("normal", "camera_degraded", "radar_anomaly"):
        obs_by_obj = generate_sensor_observations(scene, scenario=scenario, seed=1)
        print(f"\n-- {scenario} --")
        for oid, obs in obs_by_obj.items():
            trust = compute_trust_scores(obs)
            anomaly = detect_anomaly(trust)
            print(oid, "trust:", trust, "anomaly:", anomaly)
