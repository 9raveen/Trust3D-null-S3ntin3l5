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


if __name__ == "__main__":
    # Example wiring — run this on your machine once nuscenes-devkit + data are set up
    from nuscenes.nuscenes import NuScenes

    nusc = NuScenes(version="v1.0-mini", dataroot="/data/sets/nuscenes", verbose=True)
    token = get_a_sample_token(nusc)
    objs = load_real_scene(nusc, token)
    for o in objs:
        print(o)