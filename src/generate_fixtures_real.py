"""
Run this on YOUR machine (not in any sandbox) once real nuScenes-mini is
working. Produces the same three demo_fixtures/*.json files as
generate_fixtures.py, but from real data instead of mock.

Run: python3 src/generate_fixtures_real.py
"""
import json
import os

from nuscenes.nuscenes import NuScenes
from nuscenes_loader import get_a_sample_token, load_real_scene, select_demo_objects
from pipeline import build_frame
from schema import validate_frame

DATAROOT = "C:/Users/vp532/data/sets/nuscenes"  # update if your path differs
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "demo_fixtures")


def main():
    nusc = NuScenes(version="v1.0-mini", dataroot=DATAROOT, verbose=True)
    token = get_a_sample_token(nusc)
    all_objs = load_real_scene(nusc, token)
    demo_objs = select_demo_objects(all_objs, n=4)

    print(f"\nUsing {len(demo_objs)} objects for demo:")
    for o in demo_objs:
        print(" ", o)

    os.makedirs(OUT_DIR, exist_ok=True)
    for scenario in ("normal", "camera_degraded", "radar_anomaly"):
        frame = build_frame(scenario=scenario, gt_scene=demo_objs, seed=42)
        frame_dict = frame.to_dict()
        errors = validate_frame(frame_dict)
        if errors:
            print(f"  CONTRACT ERRORS for {scenario}: {errors}")
            continue
        path = os.path.join(OUT_DIR, f"{scenario}.json")
        with open(path, "w") as f:
            json.dump(frame_dict, f, indent=2)
        print(f"wrote {path} ({len(frame.objects)} objects, real data, contract OK)")
        for obj in frame.objects:
            print(f"    {obj.object_id} ({obj.type}): trust={obj.trust_scores} anomaly={obj.anomaly.flag}")


if __name__ == "__main__":
    main()