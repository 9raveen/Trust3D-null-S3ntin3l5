import { useEffect, useState } from "react";
import { getScene } from "./api";
import "./App.css";

const scenarios = [
  {
    id: "normal",
    label: "Normal",
  },
  {
    id: "camera_degraded",
    label: "Camera Degraded",
  },
  {
    id: "radar_anomaly",
    label: "Radar Anomaly",
  },
];

function App() {
  const [scenario, setScenario] = useState("normal");
  const [scene, setScene] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedObject, setSelectedObject] = useState(null);

  async function loadScene(selectedScenario) {
    try {
      setLoading(true);
      setError(null);

      const data = await getScene(selectedScenario);
      setScene(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadScene("normal");
  }, []);

  function handleScenarioChange(newScenario) {
    setScenario(newScenario);
    setSelectedObject(null);
    loadScene(newScenario);
  }

  const objects = scene?.objects || [];
  const fusionWeights = getFusionWeights(objects);

  return (
    <div className="app">
      <header className="top-nav">
        <div className="brand">
          <div className="brand-name">TRUST3D</div>
          <div className="brand-subtitle">
            Trust-Aware 3D Situational Awareness
          </div>
        </div>

        <nav className="nav-links">
          <span className="nav-active">Dashboard</span>
          <span>Sensor Fusion</span>
          <span>System</span>
        </nav>

        <div className="system-status">
          <span className="status-dot"></span>
          SYSTEM ONLINE
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <main className="dashboard">
        {/* Scene */}
        <section className="scene-panel">
          <div className="panel-header">
            <span>SCENE VIEW</span>
            <span className="frame-id">{scene?.frame_id || "..."}</span>
          </div>

          <div className="scene-toolbar">
            <span>LIVE PERCEPTION</span>

            <span className="scene-mode">3D FUSED VIEW</span>
          </div>

          <div className="scene-view" onClick={() => setSelectedObject(null)}>
            {loading ? (
              <div className="loading">ANALYZING SCENE...</div>
            ) : (
              <>
                <div className="grid"></div>

                {objects.map((object) => (
                  <SceneObject
                    key={object.object_id}
                    object={object}
                    onClick={() => setSelectedObject(object)}
                    selected={selectedObject?.object_id === object.object_id}
                  />
                ))}
                {selectedObject && (
                  <ObjectPopup
                    object={selectedObject}
                    
                  />
                )}
              </>
            )}
          </div>
        </section>

        {/* Right side */}
        <aside className="side-panel">
          <section className="card">
            <h2>SENSOR TRUST & FUSION</h2>

            {scene && objects.length > 0 && (
              <>
                <TrustBar
                  name="CAMERA"
                  value={getAverageTrust(objects, "camera")}
                  fusionWeight={fusionWeights.camera}
                />

                <TrustBar
                  name="LiDAR"
                  value={getAverageTrust(objects, "lidar")}
                  fusionWeight={fusionWeights.lidar}
                />

                <TrustBar
                  name="RADAR"
                  value={getAverageTrust(objects, "radar")}
                  fusionWeight={fusionWeights.radar}
                />
              </>
            )}
          </section>

          <section className="card">
            <h2>SCENE STATUS</h2>

            <div className="confidence">
              <span>Confidence</span>

              <strong>
                {scene
                  ? `${Math.round(getAverageSceneConfidence(objects) * 100)}%`
                  : "--"}
              </strong>
            </div>

            <div className="alerts">
              <AlertList objects={objects} />
            </div>
          </section>

          <section className="card">
            <h2>OBJECTS</h2>

            <div className="object-list">
              {objects.map((object) => (
                <div className="object-row" key={object.object_id}>
                  <span>{object.object_id}</span>

                  <span>{object.type}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>

      {/* Scenario controls */}
      <section className="scenario-controls">
        <div className="scenario-title">SCENARIO SIMULATION</div>

        <div className="buttons">
          {scenarios.map((item) => (
            <button
              key={item.id}
              className={scenario === item.id ? "active" : ""}
              onClick={() => handleScenarioChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function TrustBar({ name, value, fusionWeight }) {
  const percentage = Math.round(value * 100);
  const contribution = Math.round(fusionWeight * 100);

  const isLow = percentage < 70;

  return (
    <div className="trust-row">
      <div className="trust-label">
        <span>{name}</span>

        <strong>{percentage}%</strong>
      </div>

      <div className="trust-track">
        <div
          className={`trust-fill ${isLow ? "low" : ""}`}
          style={{
            width: `${percentage}%`,
          }}
        ></div>
      </div>

      <div className="fusion-contribution">
        Fusion contribution: {contribution}%
      </div>
    </div>
  );
}

function getFusionWeights(objects) {
  const trusts = {
    camera: getAverageTrust(objects, "camera"),
    lidar: getAverageTrust(objects, "lidar"),
    radar: getAverageTrust(objects, "radar"),
  };

  const total = trusts.camera + trusts.lidar + trusts.radar;

  if (total === 0) {
    return {
      camera: 0,
      lidar: 0,
      radar: 0,
    };
  }

  return {
    camera: trusts.camera / total,
    lidar: trusts.lidar / total,
    radar: trusts.radar / total,
  };
}

function getAverageTrust(objects, sensor) {
  if (!objects.length) {
    return 0;
  }

  const total = objects.reduce(
    (sum, object) => sum + (object.trust_scores?.[sensor] || 0),
    0,
  );

  return total / objects.length;
}

function getAverageSceneConfidence(objects) {
  if (!objects.length) {
    return 0;
  }

  const total = objects.reduce(
    (sum, object) => sum + (object.scene_confidence || 0),
    0,
  );

  return total / objects.length;
}

function AlertList({ objects }) {
  const anomalies = objects
    .filter((object) => object.anomaly?.flag)
    .map((object) => ({
      sensor: object.anomaly.sensor,
      reason: object.anomaly.reason,
    }));

  // Remove duplicate sensor + reason combinations
  const uniqueAlerts = Array.from(
    new Map(
      anomalies.map((alert) => [`${alert.sensor}-${alert.reason}`, alert]),
    ).values(),
  );

  if (uniqueAlerts.length === 0) {
    return <div className="healthy">✓ All sensors consistent</div>;
  }

  return (
    <>
      {uniqueAlerts.map((alert) => (
        <div className="alert" key={`${alert.sensor}-${alert.reason}`}>
          <span>⚠</span>

          <div>
            <strong>{alert.sensor.toUpperCase()} ANOMALY</strong>

            <small>{getAlertMessage(alert)}</small>
          </div>
        </div>
      ))}
    </>
  );
}
function getAlertMessage(alert) {
  if (
    alert.sensor === "radar" &&
    alert.reason === "radar_trust_significantly_below_other_sensors"
  ) {
    return "Radar reliability is significantly lower than other sensors";
  }

  if (
    alert.sensor === "camera" &&
    alert.reason === "camera_trust_significantly_below_other_sensors"
  ) {
    return "Camera reliability is significantly lower than other sensors";
  }

  return formatReason(alert.reason);
}
function formatReason(reason) {
  return reason
    .replaceAll("_", " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function SceneObject({ object, onClick, selected }) {
  const position = object.fused_position || object.position_3d;

  const x = position?.[0] || 0;
  const y = position?.[1] || 0;

  const left = 50 + (x / 30) * 40;
  const top = 50 - (y / 30) * 40;

  const clampedLeft = Math.max(8, Math.min(92, left));
  const clampedTop = Math.max(8, Math.min(92, top));

  const hasAnomaly = object.anomaly?.flag;

  function handleClick(event) {
    event.stopPropagation();
    onClick();
  }

  return (
    <div
      className={`scene-object
        ${hasAnomaly ? "anomaly-object" : ""}
        ${selected ? "selected-object" : ""}
      `}
      style={{
        left: `${clampedLeft}%`,
        top: `${clampedTop}%`,
      }}
      onClick={handleClick}
    >
      <div className="object-label">{object.object_id}</div>

      <div className="object-marker">
        {object.type === "pedestrian" ? "●" : "◆"}
      </div>
    </div>
  );
}

function ObjectDetails({ object, fusionWeights }) {
  const position = object.fused_position || [0, 0, 0];

  return (
    <section className="card object-details">
      <div className="details-header">
        <div>
          <h2>OBJECT DETAILS</h2>
          <strong>{object.object_id}</strong>
        </div>

        <span className="object-type">{object.type}</span>
      </div>

      <div className="details-section">
        <h3>FUSED POSITION</h3>

        <div className="position-grid">
          <div>
            <span>X</span>
            <strong>{position[0].toFixed(2)}</strong>
          </div>

          <div>
            <span>Y</span>
            <strong>{position[1].toFixed(2)}</strong>
          </div>

          <div>
            <span>Z</span>
            <strong>{position[2].toFixed(2)}</strong>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h3>SENSOR TRUST</h3>

        <DetailRow name="Camera" trust={object.trust_scores?.camera} />

        <DetailRow name="LiDAR" trust={object.trust_scores?.lidar} />

        <DetailRow name="Radar" trust={object.trust_scores?.radar} />
      </div>

      <div className="details-section">
        <h3>FUSION CONTRIBUTION</h3>

        <DetailRow name="Camera" trust={fusionWeights.camera} />

        <DetailRow name="LiDAR" trust={fusionWeights.lidar} />

        <DetailRow name="Radar" trust={fusionWeights.radar} />
      </div>

      <div className="object-confidence">
        <span>Scene confidence</span>

        <strong>{Math.round((object.scene_confidence || 0) * 100)}%</strong>
      </div>

      {object.anomaly?.flag && (
        <div className="object-alert">
          ⚠ {object.anomaly.sensor?.toUpperCase()} ANOMALY
        </div>
      )}
    </section>
  );
}

function DetailRow({ name, trust }) {
  const percentage = Math.round((trust || 0) * 100);
  const isLow = percentage < 70;

  return (
    <div className="detail-row">
      <span>{name}</span>

      <strong className={isLow ? "detail-low" : ""}>{percentage}%</strong>
    </div>
  );
}

function ObjectPopup({ object}) {
  const position = object.fused_position || [0, 0, 0];

  const x = position?.[0] || 0;
  const y = position?.[1] || 0;

  const left = 50 + (x / 30) * 40;
  const top = 50 - (y / 30) * 40;

  const clampedLeft = Math.max(8, Math.min(72, left));
  const clampedTop = Math.max(12, Math.min(88, top));

  return (
    <div
      className="object-popup"
      style={{
        left: `${clampedLeft}%`,
        top: `${clampedTop}%`,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="popup-header">
        <div>
          <strong>{object.object_id}</strong>
          <span>{object.type}</span>
        </div>

        <span className="popup-status">
          {object.anomaly?.flag ? "ANOMALY" : "STABLE"}
        </span>
      </div>

      <div className="popup-section">
        <div className="popup-title">FUSED POSITION</div>

        <div className="popup-position">
          <div>
            <span>X</span>
            <strong>{x.toFixed(2)}</strong>
          </div>

          <div>
            <span>Y</span>
            <strong>{y.toFixed(2)}</strong>
          </div>

          <div>
            <span>Z</span>
            <strong>{position[2].toFixed(2)}</strong>
          </div>
        </div>
      </div>

      <div className="popup-section">
        <div className="popup-title">SENSOR TRUST</div>

        <PopupSensor name="Camera" value={object.trust_scores?.camera} />

        <PopupSensor name="LiDAR" value={object.trust_scores?.lidar} />

        <PopupSensor name="Radar" value={object.trust_scores?.radar} />
      </div>

      <div className="popup-confidence">
        <span>SCENE CONFIDENCE</span>

        <strong>{Math.round((object.scene_confidence || 0) * 100)}%</strong>
      </div>

      {object.anomaly?.flag && (
        <div className="popup-alert">
          ⚠ {object.anomaly.sensor?.toUpperCase()} ANOMALY
        </div>
      )}
    </div>
  );
}

function PopupSensor({ name, value }) {
  const percentage = Math.round((value || 0) * 100);

  return (
    <div className="popup-sensor">
      <span>{name}</span>

      <div className="popup-bar">
        <div
          style={{
            width: `${percentage}%`,
          }}
        ></div>
      </div>

      <strong>{percentage}%</strong>
    </div>
  );
}

export default App;
