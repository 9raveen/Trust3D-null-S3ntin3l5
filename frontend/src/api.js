const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Fallback fixtures matching REAL_DEMO_OBJECTS and pipeline.py logic
const MOCK_OBJECTS = {
  normal: [
    {
      object_id: "TRK-01",
      type: "vehicle",
      position_3d: [16.19, 4.53, 1.89],
      fused_position: [16.2, 4.51, 1.89],
      velocity: [0.02, -0.03],
      trust_scores: { camera: 0.92, lidar: 0.95, radar: 0.89 },
      scene_confidence: 0.94,
      anomaly: { flag: false, sensor: null, reason: null },
    },
    {
      object_id: "TRK-02",
      type: "vehicle",
      position_3d: [-18.61, -9.18, 0.62],
      fused_position: [-18.6, -9.2, 0.61],
      velocity: [3.98, 8.71],
      trust_scores: { camera: 0.91, lidar: 0.94, radar: 0.88 },
      scene_confidence: 0.88,
      anomaly: { flag: false, sensor: null, reason: null },
    },
    {
      object_id: "TRK-03",
      type: "personnel",
      position_3d: [12.65, -18.79, 0.86],
      fused_position: [12.66, -18.8, 0.86],
      velocity: [-1.31, 0.31],
      trust_scores: { camera: 0.93, lidar: 0.96, radar: 0.9 },
      scene_confidence: 0.81,
      anomaly: { flag: false, sensor: null, reason: null },
    },
    {
      object_id: "TRK-04",
      type: "structure",
      position_3d: [-22.71, 16.82, 1.06],
      fused_position: [-22.7, 16.8, 1.05],
      velocity: [0.0, 0.0],
      trust_scores: { camera: 0.94, lidar: 0.97, radar: 0.91 },
      scene_confidence: 0.9,
      anomaly: { flag: false, sensor: null, reason: null },
    },
  ],
  camera_degraded: [
    {
      object_id: "TRK-01",
      type: "vehicle",
      position_3d: [16.19, 4.53, 1.89],
      fused_position: [16.15, 4.55, 1.89],
      velocity: [0.02, -0.03],
      trust_scores: { camera: 0.34, lidar: 0.96, radar: 0.89 },
      scene_confidence: 0.87,
      anomaly: {
        flag: true,
        sensor: "camera",
        reason: "camera_trust_significantly_below_other_sensors",
      },
    },
    {
      object_id: "TRK-02",
      type: "vehicle",
      position_3d: [-18.61, -9.18, 0.62],
      fused_position: [-18.58, -9.22, 0.61],
      velocity: [3.98, 8.71],
      trust_scores: { camera: 0.38, lidar: 0.95, radar: 0.88 },
      scene_confidence: 0.84,
      anomaly: {
        flag: true,
        sensor: "camera",
        reason: "camera_trust_significantly_below_other_sensors",
      },
    },
    {
      object_id: "TRK-03",
      type: "personnel",
      position_3d: [12.65, -18.79, 0.86],
      fused_position: [12.68, -18.75, 0.86],
      velocity: [-1.31, 0.31],
      trust_scores: { camera: 0.31, lidar: 0.94, radar: 0.9 },
      scene_confidence: 0.79,
      anomaly: {
        flag: true,
        sensor: "camera",
        reason: "camera_trust_significantly_below_other_sensors",
      },
    },
    {
      object_id: "TRK-04",
      type: "structure",
      position_3d: [-22.71, 16.82, 1.06],
      fused_position: [-22.7, 16.8, 1.05],
      velocity: [0.0, 0.0],
      trust_scores: { camera: 0.35, lidar: 0.97, radar: 0.91 },
      scene_confidence: 0.86,
      anomaly: {
        flag: true,
        sensor: "camera",
        reason: "camera_trust_significantly_below_other_sensors",
      },
    },
  ],
  radar_anomaly: [
    {
      object_id: "TRK-01",
      type: "vehicle",
      position_3d: [16.19, 4.53, 1.89],
      fused_position: [16.2, 4.51, 1.89],
      velocity: [0.02, -0.03],
      trust_scores: { camera: 0.93, lidar: 0.96, radar: 0.28 },
      scene_confidence: 0.89,
      anomaly: {
        flag: true,
        sensor: "radar",
        reason: "radar_trust_significantly_below_other_sensors",
      },
    },
    {
      object_id: "TRK-02",
      type: "vehicle",
      position_3d: [-18.61, -9.18, 0.62],
      fused_position: [-18.6, -9.2, 0.61],
      velocity: [3.98, 8.71],
      trust_scores: { camera: 0.91, lidar: 0.95, radar: 0.31 },
      scene_confidence: 0.83,
      anomaly: {
        flag: true,
        sensor: "radar",
        reason: "radar_trust_significantly_below_other_sensors",
      },
    },
    {
      object_id: "TRK-03",
      type: "personnel",
      position_3d: [12.65, -18.79, 0.86],
      fused_position: [12.66, -18.8, 0.86],
      velocity: [-1.31, 0.31],
      trust_scores: { camera: 0.92, lidar: 0.95, radar: 0.25 },
      scene_confidence: 0.78,
      anomaly: {
        flag: true,
        sensor: "radar",
        reason: "radar_trust_significantly_below_other_sensors",
      },
    },
    {
      object_id: "TRK-04",
      type: "structure",
      position_3d: [-22.71, 16.82, 1.06],
      fused_position: [-22.7, 16.8, 1.05],
      velocity: [0.0, 0.0],
      trust_scores: { camera: 0.95, lidar: 0.97, radar: 0.29 },
      scene_confidence: 0.88,
      anomaly: {
        flag: true,
        sensor: "radar",
        reason: "radar_trust_significantly_below_other_sensors",
      },
    },
  ],
};

async function fetchWithTimeout(url, timeoutMs = 400) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

export async function getScene(scenario = "normal") {
  try {
    const response = await fetchWithTimeout(
      `${API_URL}/scene?scenario=${scenario}`,
    );
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    return await response.json();
  } catch {
    // Graceful fallback to rich mock data
    const key = scenario in MOCK_OBJECTS ? scenario : "normal";
    return {
      frame_id: `frame_${scenario}_001`,
      scenario: scenario,
      objects: MOCK_OBJECTS[key],
    };
  }
}

export async function getSceneSequence(scenario = "normal", nFrames = 12) {
  try {
    const response = await fetchWithTimeout(
      `${API_URL}/scene/sequence?scenario=${scenario}&n_frames=${nFrames}`,
    );
    if (!response.ok) throw new Error("Failed to fetch scene sequence");
    return await response.json();
  } catch {
    const key = scenario in MOCK_OBJECTS ? scenario : "normal";
    const baseObjs = MOCK_OBJECTS[key];
    const frames = [];
    for (let f = 0; f < nFrames; f++) {
      const t = f * 0.5;
      const objs = baseObjs.map((obj, i) => {
        const vx = obj.velocity?.[0] || 0;
        const vy = obj.velocity?.[1] || 0;
        const posX = obj.position_3d[0] + vx * t * 0.15 + Math.sin(f + i) * 0.2;
        const posY = obj.position_3d[1] + vy * t * 0.15 + Math.cos(f + i) * 0.2;
        return {
          ...obj,
          fused_position: [posX, posY, obj.position_3d[2]],
          smoothed_position: [
            obj.position_3d[0] + vx * t * 0.15,
            obj.position_3d[1] + vy * t * 0.15,
            obj.position_3d[2],
          ],
        };
      });
      frames.push({
        frame_id: `frame_${scenario}_${String(f + 1).padStart(3, "0")}`,
        scenario,
        objects: objs,
      });
    }
    return frames;
  }
}
