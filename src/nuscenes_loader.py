"""
Real nuScenes-mini loader. This replaces synthetic_detections.load_mock_scene()
once you have the dataset downloaded locally. Cannot be tested in this sandbox
(no network access to nuScenes' S3 bucket, no nuscenes-devkit installed) —
run this on your own machine.

SETUP (do this first, on your laptop, not in any sandbox):
    pip install nuscenes-devkit

    # Download nuScenes-mini (~4GB) from https://www.nuscenes.org/download
    # (free account required). Unzip so you end up with:
    #   /data/sets/nuscenes/v1.0-mini/...
    #   /data/sets/nuscenes/samples/...
    #   /data/sets/nuscenes/sweeps/...

WHY THE ALIGNMENT STEP MATTERS:
    nuScenes stores each object's box in GLOBAL coordinates (map frame).
    Your trust/fusion pipeline wants everything in EGO VEHICLE coordinates
    at that timestamp — that's the "common coordinate system" the deck's
    Stage 3 (ALIGN) refers to. nuScenes gives you the ego_pose record for
    free per sample; you just need to apply the inverse transform.

USAGE (once devkit + data are set up):
    from nuscenes_loader import load_real_scene
    gt_objects = load_real_scene(sample_token="...")
    # gt_objects is a list[GroundTruthObject], same shape as load_mock_scene()
    # output — drop it straight into generate_sensor_observations()
"""
from synthetic_detections import GroundTruthObject


def get_a_sample_token(nusc, scene_name: str | None = None) -> str:
    """Grab the first sample token from a scene (or the first scene if unspecified).
    Useful for quickly testing without hunting through the dataset by hand."""
    scene = nusc.scene[0] if scene_name is None else next(
        s for s in nusc.scene if s["name"] == scene_name
    )
    return scene["first_sample_token"]


def load_real_scene(nusc, sample_token: str) -> list[GroundTruthObject]:
    """
    nusc: a nuscenes.nuscenes.NuScenes instance, e.g.
        from nuscenes.nuscenes import NuScenes
        nusc = NuScenes(version='v1.0-mini', dataroot='/data/sets/nuscenes')

    Returns objects with position/velocity already transformed into ego frame.
    """
    from pyquaternion import Quaternion
    import numpy as np

    sample = nusc.get("sample", sample_token)

    # ego_pose for this sample's timestamp (via any one of its sensor records,
    # they share the same ego pose at capture time — LIDAR_TOP is the nuScenes
    # convention as the "reference" sensor)
    lidar_data = nusc.get("sample_data", sample["data"]["LIDAR_TOP"])
    ego_pose = nusc.get("ego_pose", lidar_data["ego_pose_token"])
    ego_translation = np.array(ego_pose["translation"])
    ego_rotation_inv = Quaternion(ego_pose["rotation"]).inverse

    objects = []
    for ann_token in sample["anns"]:
        ann = nusc.get("sample_annotation", ann_token)

        # global -> ego frame: subtract ego translation, then un-rotate
        global_pos = np.array(ann["translation"])
        ego_frame_pos = ego_rotation_inv.rotate(global_pos - ego_translation)

        # nuScenes gives velocity in global frame too (m/s); nusc.box_velocity()
        # handles the frames-with-no-next-sample edge case better than doing it
        # by hand — use that if available, else default to [0, 0]
        velocity = nusc.box_velocity(ann_token)
        vx, vy = (float(velocity[0]), float(velocity[1])) if velocity is not None and not np.isnan(velocity[0]) else (0.0, 0.0)

        objects.append(GroundTruthObject(
            object_id=ann["instance_token"][:8],  # short id for readability
            type=ann["category_name"].split(".")[0],  # e.g. "vehicle.car" -> "vehicle"
            position_3d=[round(float(v), 3) for v in ego_frame_pos],
            velocity=[round(vx, 3), round(vy, 3)],
        ))
    return objects


def select_demo_objects(gt_objects: list[GroundTruthObject], n: int = 4) -> list[GroundTruthObject]:
    """
    Real nuScenes samples can have 60+ annotated objects — far too many for
    a readable demo (trust bars per object won't fit on a projector). Pick
    the n closest objects to the ego vehicle instead, prioritizing variety
    of type so the demo shows vehicles AND pedestrians, not just parked cars.

    Excludes "movable_object" (traffic cones, barriers, debris) — technically
    valid nuScenes objects but a weak story for a trust-in-perception demo.
    """
    import math

    DEMO_WORTHY_TYPES = {"vehicle", "human"}

    def dist(obj):
        return math.hypot(obj.position_3d[0], obj.position_3d[1])

    candidates = [o for o in gt_objects if o.type in DEMO_WORTHY_TYPES]

    by_type: dict[str, list[GroundTruthObject]] = {}
    for obj in candidates:
        by_type.setdefault(obj.type, []).append(obj)
    for t in by_type:
        by_type[t].sort(key=dist)

    selected = []
    types = list(by_type.keys())
    i = 0
    while len(selected) < n and any(by_type.values()):
        t = types[i % len(types)]
        if by_type[t]:
            selected.append(by_type[t].pop(0))
        i += 1
        if i > 1000:  # safety valve
            break
    return sorted(selected, key=dist)[:n]


if __name__ == "__main__":
    # Example wiring — run this on your machine once nuscenes-devkit + data are set up
    from nuscenes.nuscenes import NuScenes

    nusc = NuScenes(version="v1.0-mini", dataroot="C:/Users/vp532/data/sets/nuscenes", verbose=True)
    token = get_a_sample_token(nusc)
    objs = load_real_scene(nusc, token)
    print(f"\n{len(objs)} total annotated objects in this sample")
    demo_objs = select_demo_objects(objs, n=4)
    print(f"selected {len(demo_objs)} for demo:")
    for o in demo_objs:
        print(o)