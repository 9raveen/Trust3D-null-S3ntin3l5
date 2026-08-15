"""
Stdlib-only tests (no pytest needed, keep hackathon setup friction at zero).
Run: python3 tests/test_pipeline.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from schema import validate_frame
from pipeline import build_frame


def check(condition, msg):
    if not condition:
        raise AssertionError(msg)
    print(f"  PASS: {msg}")


def test_contract_valid_all_scenarios():
    print("test_contract_valid_all_scenarios")
    for scenario in ("normal", "camera_degraded", "radar_anomaly"):
        frame = build_frame(scenario=scenario)
        errors = validate_frame(frame.to_dict())
        check(errors == [], f"{scenario}: no contract errors (got {errors})")


def test_camera_degraded_lowers_camera_trust_only():
    print("test_camera_degraded_lowers_camera_trust_only")
    normal = build_frame(scenario="normal")
    degraded = build_frame(scenario="camera_degraded")
    for n_obj, d_obj in zip(normal.objects, degraded.objects):
        check(
            d_obj.trust_scores["camera"] < n_obj.trust_scores["camera"] - 0.15,
            f"{d_obj.object_id}: camera trust drops meaningfully "
            f"({n_obj.trust_scores['camera']} -> {d_obj.trust_scores['camera']})",
        )
        check(
            abs(d_obj.trust_scores["lidar"] - n_obj.trust_scores["lidar"]) < 0.1,
            f"{d_obj.object_id}: lidar trust stays roughly stable",
        )


def test_radar_anomaly_flags_radar():
    print("test_radar_anomaly_flags_radar")
    frame = build_frame(scenario="radar_anomaly")
    for obj in frame.objects:
        check(obj.anomaly.flag is True, f"{obj.object_id}: anomaly flagged")
        check(obj.anomaly.sensor == "radar", f"{obj.object_id}: radar identified as the anomalous sensor")


def test_normal_scenario_has_no_anomalies():
    print("test_normal_scenario_has_no_anomalies")
    frame = build_frame(scenario="normal")
    for obj in frame.objects:
        check(obj.anomaly.flag is False, f"{obj.object_id}: no false-positive anomaly in normal scenario")


def test_scene_confidence_drops_under_degradation():
    print("test_scene_confidence_drops_under_degradation")
    normal = build_frame(scenario="normal")
    radar_bad = build_frame(scenario="radar_anomaly")
    for n_obj, r_obj in zip(normal.objects, radar_bad.objects):
        check(
            r_obj.scene_confidence < n_obj.scene_confidence,
            f"{n_obj.object_id}: scene confidence drops when radar degrades "
            f"({n_obj.scene_confidence} -> {r_obj.scene_confidence})",
        )


def test_fused_position_stays_reasonable():
    print("test_fused_position_stays_reasonable")
    frame = build_frame(scenario="radar_anomaly")
    for obj in frame.objects:
        for i in range(3):
            check(
                abs(obj.fused_position[i] - obj.position_3d[i]) < 2.0,
                f"{obj.object_id}: fused position stays near ground truth on axis {i}",
            )


def test_reproducibility():
    print("test_reproducibility")
    a = build_frame(scenario="normal", seed=7)
    b = build_frame(scenario="normal", seed=7)
    check(a.to_dict() == b.to_dict(), "same seed produces identical frame (needed for demo reliability)")


if __name__ == "__main__":
    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        try:
            t()
        except AssertionError as e:
            print(f"  FAIL: {e}")
            failed += 1
        print()
    total = len(tests)
    print(f"{total - failed}/{total} tests passed")
    if failed:
        sys.exit(1)