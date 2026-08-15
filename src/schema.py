"""
Shared frame schema — Track A (perception/trust/fusion) produces this,
Track B (FastAPI/dashboard) consumes it. Keep this file identical on
both sides of the repo; if you change a field, change it here first
and re-share with your teammate.
"""
from dataclasses import dataclass, field, asdict
from typing import Literal

SensorName = Literal["camera", "lidar", "radar"]


@dataclass
class SensorObservation:
    confidence: float   # 0-1, detection confidence for this sensor
    health: float        # 0-1, simulated sensor health (1.0 = nominal)


@dataclass
class Anomaly:
    flag: bool
    sensor: str | None = None
    reason: str | None = None


@dataclass
class FusedObject:
    object_id: str
    type: str
    position_3d: list[float]      # [x, y, z] in ego/world frame
    velocity: list[float]         # [vx, vy]
    sensor_observations: dict[str, SensorObservation]
    trust_scores: dict[str, float]
    fused_position: list[float]
    scene_confidence: float
    anomaly: Anomaly

    def to_dict(self) -> dict:
        return {
            "object_id": self.object_id,
            "type": self.type,
            "position_3d": self.position_3d,
            "velocity": self.velocity,
            "sensor_observations": {
                k: asdict(v) for k, v in self.sensor_observations.items()
            },
            "trust_scores": self.trust_scores,
            "fused_position": self.fused_position,
            "scene_confidence": self.scene_confidence,
            "anomaly": asdict(self.anomaly),
        }


@dataclass
class Frame:
    frame_id: str
    objects: list[FusedObject] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {"frame_id": self.frame_id, "objects": [o.to_dict() for o in self.objects]}


def validate_frame(frame_dict: dict) -> list[str]:
    """Cheap contract check — run this in CI or before every integration sync."""
    errors = []
    if "frame_id" not in frame_dict:
        errors.append("missing frame_id")
    for i, obj in enumerate(frame_dict.get("objects", [])):
        for req in ("object_id", "type", "position_3d", "sensor_observations",
                     "trust_scores", "fused_position", "scene_confidence", "anomaly"):
            if req not in obj:
                errors.append(f"objects[{i}] missing '{req}'")
        for sensor in ("camera", "lidar", "radar"):
            if sensor in obj.get("sensor_observations", {}):
                so = obj["sensor_observations"][sensor]
                if not (0 <= so.get("confidence", -1) <= 1):
                    errors.append(f"objects[{i}].{sensor}.confidence out of range")
    return errors
