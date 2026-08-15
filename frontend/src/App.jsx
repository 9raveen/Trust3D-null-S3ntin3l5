import React, { useEffect, useState, useRef } from "react";
import { getScene, getSceneSequence } from "./api";
import "./App.css";

const SCENARIOS = [
  {
    id: "normal",
    code: "SCN-A",
    shortLabel: "NOMINAL",
    title: "Nominal",
    description: "All three modalities agree. Fusion weights stay balanced.",
    cameraSubtext: "Vehicle detected, stable appearance",
    lidarSubtext: "Dense returns, consistent geometry",
    radarSubtext: "Velocity consistent with track history",
    statusBadge: "NO ANOMALIES · ALL STREAMS WEIGHTED",
    statusType: "nominal",
  },
  {
    id: "camera_degraded",
    code: "SCN-B",
    shortLabel: "CAMERA DEGRADED",
    title: "Camera Degraded",
    description: "Camera trust drops due to severe glare/occlusion. Fusion weights shift to LiDAR and Radar.",
    cameraSubtext: "Low contrast, optical glare detected",
    lidarSubtext: "Dense returns, consistent geometry",
    radarSubtext: "Velocity consistent with track history",
    statusBadge: "CAMERA DEGRADED · WEIGHTS SHIFTED TO LIDAR+RADAR",
    statusType: "warning",
  },
  {
    id: "radar_anomaly",
    code: "SCN-C",
    shortLabel: "RADAR ANOMALY",
    title: "Radar Anomaly",
    description: "Radar outputs ghost detections/velocity mismatch. Trust score penalizes Radar, preventing false alarms.",
    cameraSubtext: "Vehicle detected, stable appearance",
    lidarSubtext: "Dense returns, consistent geometry",
    radarSubtext: "Doppler velocity divergence / ghost echo",
    statusBadge: "RADAR ANOMALY FLAGGED · ISOLATED FROM FUSION",
    statusType: "warning",
  },
];

export default function App() {
  const [selectedScenarioId, setSelectedScenarioId] = useState("normal");
  const [scene, setScene] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [sequenceMode, setSequenceMode] = useState(false);
  const sequenceIntervalRef = useRef(null);

  const currentScenarioMeta =
    SCENARIOS.find((s) => s.id === selectedScenarioId) || SCENARIOS[0];

  async function loadScene(scenId) {
    try {
      setLoading(true);
      const data = await getScene(scenId);
      setScene(data);
    } catch (err) {
      console.error("Failed to load scene:", err);
    } finally {
      setLoading(false);
    }
  }

  async function startSequence(scenId) {
    try {
      setLoading(true);
      const frames = await getSceneSequence(scenId, 12);
      let idx = 0;
      setScene(frames[0]);
      setLoading(false);

      if (sequenceIntervalRef.current) {
        clearInterval(sequenceIntervalRef.current);
      }

      sequenceIntervalRef.current = setInterval(() => {
        idx = (idx + 1) % frames.length;
        const frame = frames[idx];
        setScene(frame);
        setSelectedObject((prev) =>
          prev
            ? frame.objects.find((o) => o.object_id === prev.object_id) || null
            : null,
        );
      }, 500);
    } catch (err) {
      console.error("Sequence error:", err);
      setLoading(false);
    }
  }

  function stopSequence() {
    if (sequenceIntervalRef.current) {
      clearInterval(sequenceIntervalRef.current);
      sequenceIntervalRef.current = null;
    }
  }

  function toggleSequenceMode() {
    const next = !sequenceMode;
    setSequenceMode(next);
    setSelectedObject(null);
    if (next) {
      startSequence(selectedScenarioId);
    } else {
      stopSequence();
      loadScene(selectedScenarioId);
    }
  }

  useEffect(() => {
    loadScene("normal");
    return () => stopSequence();
  }, []);

  function handleScenarioChange(newScenarioId) {
    setSelectedScenarioId(newScenarioId);
    setSelectedObject(null);
    if (sequenceMode) {
      startSequence(newScenarioId);
    } else {
      loadScene(newScenarioId);
    }
  }

  const objects = scene?.objects || [];
  const fusionWeights = getFusionWeights(objects);

  const avgCameraTrust = getAverageTrust(objects, "camera");
  const avgLidarTrust = getAverageTrust(objects, "lidar");
  const avgRadarTrust = getAverageTrust(objects, "radar");

  const avgConfidence = getAverageSceneConfidence(objects);
  const confidencePercent = Math.round(avgConfidence * 100);

  const crossSensorAgreement = (
    1 - Math.abs(avgCameraTrust - avgLidarTrust) * 0.5 - Math.abs(avgLidarTrust - avgRadarTrust) * 0.5
  ).toFixed(2);

  return (
    <div className="landing-page">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <div className="brand-badge">T3</div>
            <div className="brand-text">
              <span className="brand-title">TRUST3D</span>
              <span className="brand-subtitle">TRUST-AWARE 3D AWARENESS</span>
            </div>
          </div>

          <nav className="nav-links">
            <a href="#problem">PROBLEM</a>
            <a href="#pipeline">PIPELINE</a>
            <a href="#demo">CONSOLE</a>
            <a href="#roadmap">ROADMAP</a>
          </nav>

          <div className="nav-right">
            <span className="nav-tag">INFINITY HACKS 2026 · DEFENCE</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* HERO SECTION (Image 1) */}
        <section className="hero-section" id="hero">
          <div className="hero-left">
            <div className="team-pill">
              <span className="pill-dot"></span>
              <span>TEAM NULLS3NTIN3LS</span>
            </div>

            <h1 className="hero-title">
              When sensors<br />
              disagree,<br />
              <span className="text-highlight">evaluate the<br />evidence</span><br />
              before trusting the<br />
              result.
            </h1>

            <p className="hero-description">
              TRUST3D fuses camera, LiDAR and radar into a unified 3D / BEV situational picture — and continuously scores how reliable each sensor is right now. Reliable evidence gains influence, inconsistent evidence loses it and gets flagged.
            </p>

            <div className="hero-actions">
              <a href="#demo" className="btn-primary">
                OPEN LIVE CONSOLE
              </a>
              <a href="#pipeline" className="btn-secondary">
                SEE THE PIPELINE
              </a>
            </div>
          </div>

          <div className="hero-right">
            <div className="qa-card">
              <div className="qa-header">ANSWERING THREE QUESTIONS</div>

              <div className="qa-item">
                <div className="qa-label">WHAT?</div>
                <div className="qa-value">Vehicle · personnel · structure</div>
              </div>

              <div className="qa-item">
                <div className="qa-label">WHERE?</div>
                <div className="qa-value">3D position in one common frame</div>
              </div>

              <div className="qa-item">
                <div className="qa-label">HOW SURE?</div>
                <div className="qa-value">Sensor trust · scene confidence · anomalies</div>
              </div>

              <div className="qa-diagram-box">
                <div className="diagram-row">
                  <span>camera ─┐</span>
                </div>
                <div className="diagram-row">
                  <span>lidar  ──┼──&gt; </span>
                  <strong className="text-cyan">TRUST ENGINE</strong>
                  <span> ──&gt; ADAPTIVE FUSION ──&gt; SCENE</span>
                </div>
                <div className="diagram-row">
                  <span>radar  ─┘                           └──&gt; confidence / alert</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 01 · THE PROBLEM SECTION (Image 2) */}
        <section className="section" id="problem">
          <div className="section-tag">01 · THE PROBLEM</div>
          <h2 className="section-title">
            The problem is not lack of data. It is lack of{" "}
            <span className="text-amber">trustworthy data</span>.
          </h2>

          <div className="cards-grid-3">
            <div className="info-card">
              <h3 className="card-heading">Sensors degrade silently</h3>
              <p className="card-text">
                Noise, occlusion, darkness, interference and missing returns all look like normal data to a conventional fusion stack.
              </p>
            </div>

            <div className="info-card">
              <h3 className="card-heading">Confident and wrong</h3>
              <p className="card-text">
                Several sensors can collectively produce a highly confident but incorrect result when one of them is quietly lying.
              </p>
            </div>

            <div className="info-card">
              <h3 className="card-heading">Dropping a sensor is too blunt</h3>
              <p className="card-text">
                Radar at 51% is not garbage. It is uncertain. It should be down-weighted and flagged, not deleted.
              </p>
            </div>
          </div>

          <div className="cards-grid-3 level-grid">
            <div className="info-card level-card">
              <div className="level-tag">L1</div>
              <h3 className="level-title">Perception</h3>
              <p className="level-desc">What is there?</p>
            </div>

            <div className="info-card level-card">
              <div className="level-tag">L2</div>
              <h3 className="level-title">Fusion</h3>
              <p className="level-desc">What do all sensors collectively say?</p>
            </div>

            <div className="info-card level-card">
              <div className="level-tag">L3</div>
              <h3 className="level-title">Trust</h3>
              <p className="level-desc">Which observations should influence my belief?</p>
            </div>
          </div>
        </section>

        {/* 02 · ARCHITECTURE SECTION (Image 3) */}
        <section className="section" id="pipeline">
          <div className="section-tag">02 · ARCHITECTURE</div>
          <h2 className="section-title">Six stages, one trusted scene</h2>

          <div className="stages-grid">
            <div className="stage-card">
              <div className="stage-header">
                <span className="stage-title">Sense</span>
                <span className="stage-number">01</span>
              </div>
              <p className="stage-desc">
                Camera, LiDAR, radar and GNSS/IMU streams from nuScenes.
              </p>
            </div>

            <div className="stage-card">
              <div className="stage-header">
                <span className="stage-title">Perceive</span>
                <span className="stage-number">02</span>
              </div>
              <p className="stage-desc">
                Pretrained YOLO detection plus point-cloud and radar processing.
              </p>
            </div>

            <div className="stage-card">
              <div className="stage-header">
                <span className="stage-title">Align</span>
                <span className="stage-number">03</span>
              </div>
              <p className="stage-desc">
                Calibration transforms every observation into one vehicle frame.
              </p>
            </div>

            <div className="stage-card">
              <div className="stage-header">
                <span className="stage-title">Fuse</span>
                <span className="stage-number">04</span>
              </div>
              <p className="stage-desc">
                Object association links evidence belonging to the same target.
              </p>
            </div>

            <div className="stage-card">
              <div className="stage-header">
                <span className="stage-title">Trust</span>
                <span className="stage-number">05</span>
              </div>
              <p className="stage-desc">
                Sensor health, detection confidence and cross-sensor agreement.
              </p>
            </div>

            <div className="stage-card">
              <div className="stage-header">
                <span className="stage-title">Visualize</span>
                <span className="stage-number">06</span>
              </div>
              <p className="stage-desc">
                3D / BEV scene with per-object and per-sensor confidence.
              </p>
            </div>
          </div>
        </section>

        {/* 03 · DEMONSTRATION SECTION (Image 4 & Image 5) */}
        <section className="section" id="demo">
          <div className="section-tag">03 · DEMONSTRATION</div>
          <h2 className="section-title">Trust engine, live</h2>
          <p className="section-subtitle">
            Switch between the three demo scenarios. Watch trust scores, fusion weights and the BEV scene respond while the picture stays stable.
          </p>

          <div className="simulator-container">
            {/* Top Simulator Header */}
            <div className="sim-header">
              <div className="sim-info">
                <div className="sim-label">LIVE SCENARIO SIMULATOR</div>
                <div className="sim-title">{currentScenarioMeta.title}</div>
                <div className="sim-description">{currentScenarioMeta.description}</div>
              </div>

              <div className="sim-tabs">
                {SCENARIOS.map((scen) => (
                  <button
                    key={scen.id}
                    className={`sim-tab-btn ${selectedScenarioId === scen.id ? "active" : ""}`}
                    onClick={() => handleScenarioChange(scen.id)}
                  >
                    {scen.code} · {scen.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Screen Console */}
            <div className="sim-body">
              {/* Left Column: Sensor Trust Bars */}
              <div className="sim-left-panel">
                {/* Camera Sensor Bar */}
                <SensorTrustCard
                  name="Camera"
                  category="CLASSIFICATION / SEMANTICS"
                  score={avgCameraTrust}
                  weight={fusionWeights.camera}
                  subtext={currentScenarioMeta.cameraSubtext}
                  isDegraded={avgCameraTrust < 0.6}
                />

                {/* LiDAR Sensor Bar */}
                <SensorTrustCard
                  name="LiDAR"
                  category="DEPTH / 3D GEOMETRY"
                  score={avgLidarTrust}
                  weight={fusionWeights.lidar}
                  subtext={currentScenarioMeta.lidarSubtext}
                  isDegraded={avgLidarTrust < 0.6}
                />

                {/* Radar Sensor Bar */}
                <SensorTrustCard
                  name="Radar"
                  category="RANGE / VELOCITY"
                  score={avgRadarTrust}
                  weight={fusionWeights.radar}
                  subtext={currentScenarioMeta.radarSubtext}
                  isDegraded={avgRadarTrust < 0.6}
                />
              </div>

              {/* Right Column: BEV Radar Screen */}
              <div className="sim-right-panel">
                <div className="bev-container">
                  <div className="bev-top-header">
                    <span className="bev-title">BEV · VEHICLE FRAME</span>
                    <button
                      className={`bev-seq-btn ${sequenceMode ? "active" : ""}`}
                      onClick={toggleSequenceMode}
                    >
                      {sequenceMode ? "⏸ PAUSE" : "▶ PLAY TRAJECTORY"}
                    </button>
                  </div>

                  <div className="bev-radar-view" onClick={() => setSelectedObject(null)}>
                    {/* Concentric Radar Rings & Crosshairs */}
                    <div className="radar-grid">
                      <div className="radar-circle ring-4"></div>
                      <div className="radar-circle ring-3"></div>
                      <div className="radar-circle ring-2"></div>
                      <div className="radar-circle ring-1"></div>
                      <div className="radar-axis axis-x"></div>
                      <div className="radar-axis axis-y"></div>
                      
                      {/* Revolving Radar Scanning Sweep */}
                      <div className="radar-scanner-sweep">
                        <div className="radar-sweep-sector"></div>
                        <div className="radar-sweep-line"></div>
                      </div>

                      {/* Ego Vehicle Center */}
                      <div className="ego-vehicle-ring">
                        <div className="ego-vehicle-dot"></div>
                      </div>
                    </div>

                    {/* Objects */}
                    {objects.map((obj) => (
                      <BevRadarNode
                        key={obj.object_id}
                        object={obj}
                        isSelected={selectedObject?.object_id === obj.object_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedObject(obj);
                        }}
                      />
                    ))}

                    {/* Smoothed Trail Markers */}
                    {sequenceMode &&
                      objects.map((obj) =>
                        obj.smoothed_position ? (
                          <SmoothedTrailNode
                            key={`smoothed-${obj.object_id}`}
                            position={obj.smoothed_position}
                          />
                        ) : null,
                      )}

                    {/* Object Detail Popup */}
                    {selectedObject && (
                      <ObjectInspectorPopup
                        object={selectedObject}
                        onClose={() => setSelectedObject(null)}
                      />
                    )}

                    <div className="bev-range-tag">RANGE 80 M</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Diagnostics Stream Bar (Image 5 top) */}
            <div className="sim-diagnostics">
              <div className="diag-header-row">
                <div className={`diag-badge ${currentScenarioMeta.statusType}`}>
                  {currentScenarioMeta.statusBadge}
                </div>
              </div>

              <div className="diag-logs-container">
                <div className="diag-log-line">
                  <span className="log-arrow">&gt; ALIGN</span>
                  <span className="log-text">· 3 streams mapped to vehicle frame</span>
                </div>
                <div className="diag-log-line">
                  <span className="log-arrow">&gt; TRUST</span>
                  <span className="log-text">· cross-sensor agreement {crossSensorAgreement}</span>
                </div>
                <div className="diag-log-line">
                  <span className="log-arrow">&gt; FUSE</span>
                  <span className="log-text">
                    · weights {fusionWeights.camera.toFixed(2)} / {fusionWeights.lidar.toFixed(2)} / {fusionWeights.radar.toFixed(2)}
                  </span>
                </div>
                <div className="diag-log-line">
                  <span className="log-arrow">&gt; SCENE</span>
                  <span className="log-text">
                    · {objects.length} tracks published · confidence {confidencePercent >= 85 ? "HIGH" : "NOMINAL"} ({confidencePercent}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 04 · 24-HOUR PLAN SECTION */}
        <section className="section" id="roadmap">
          <div className="section-tag">04 · 24-HOUR PLAN</div>
          <h2 className="section-title">Build order</h2>

          <div className="build-table">
            <div className="build-row">
              <div className="build-time">0-6 h</div>
              <div className="build-phase">Data &amp; Perception</div>
              <div className="build-desc">nuScenes streams + calibration &amp; Camera, LiDAR and radar processing</div>
            </div>
            <div className="build-row">
              <div className="build-time">6-14 h</div>
              <div className="build-phase">Trust &amp; Fusion</div>
              <div className="build-desc">Health, reliability, anomaly detection &amp; Association + adaptive 3D/BEV</div>
            </div>
            <div className="build-row">
              <div className="build-time">14-24 h</div>
              <div className="build-phase">Demo</div>
              <div className="build-desc">Dashboard, failure scenarios, testing</div>
            </div>
          </div>

          <div className="proof-card">
            <h3 className="proof-title">What the demo proves</h3>
            <p className="proof-body">
              A multi-sensor system can detect when one sensor becomes unreliable and dynamically reduce that sensor&apos;s influence, instead of blindly trusting it — while keeping the situational picture intact.
            </p>
          </div>
        </section>
      </main>

      {/* Footer (Image 5) */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-left">TRUST3D · NULLS3NTIN3LS</div>
          <div className="footer-center">
            MANIKANTA BOJJA · V PRAVEEN · G APRAMEYA GOUD
          </div>
          <div className="footer-right">DATA: NUSCENES · VALUES ILLUSTRATIVE</div>
        </div>
      </footer>
    </div>
  );
}

/* Helper Components */

function SensorTrustCard({ name, category, score, weight, subtext, isDegraded }) {
  const percentage = Math.round((score || 0) * 100);
  const statusLabel = isDegraded ? "DEGRADED" : "NOMINAL";

  return (
    <div className={`sensor-trust-box ${isDegraded ? "sensor-degraded" : ""}`}>
      <div className="sensor-top-row">
        <div className="sensor-name-group">
          <span className="sensor-name">{name}</span>
          <span className="sensor-category">{category}</span>
        </div>
        <div className="sensor-score-group">
          <span className="sensor-score">{percentage}%</span>
          <span className={`sensor-status-tag ${isDegraded ? "tag-degraded" : "tag-nominal"}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="sensor-progress-track">
        <div
          className={`sensor-progress-fill ${isDegraded ? "fill-degraded" : "fill-nominal"}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>

      <div className="sensor-bottom-row">
        <span className="sensor-subtext">{subtext}</span>
        <span className="sensor-weight">W {(weight || 0).toFixed(2)}</span>
      </div>
    </div>
  );
}

function BevRadarNode({ object, isSelected, onClick }) {
  const pos = object.fused_position || object.position_3d || [0, 0, 0];
  const x = pos[0];
  const y = pos[1];

  // Map coordinate range (-40m to +40m) to percentage (0% to 100%)
  const left = 50 + (x / 40) * 38;
  const top = 50 - (y / 40) * 38;

  const clampedLeft = Math.max(12, Math.min(88, left));
  const clampedTop = Math.max(12, Math.min(88, top));

  const hasAnomaly = object.anomaly?.flag;
  const confPercent = Math.round((object.scene_confidence || 0.9) * 100);

  const displayType = (object.type || "target").toUpperCase();

  return (
    <div
      className={`bev-object-node ${isSelected ? "selected" : ""} ${hasAnomaly ? "anomaly" : ""}`}
      style={{ left: `${clampedLeft}%`, top: `${clampedTop}%` }}
      onClick={onClick}
    >
      <div className="bev-node-box">
        <span className="bev-node-dot"></span>
      </div>
      <div className="bev-node-text-group">
        <span className="bev-node-id">{object.object_id}</span>
        <span className="bev-node-type-conf">{displayType} {confPercent}%</span>
      </div>
    </div>
  );
}

function SmoothedTrailNode({ position }) {
  const x = position[0] || 0;
  const y = position[1] || 0;

  const left = 50 + (x / 40) * 42;
  const top = 50 - (y / 40) * 42;

  const clampedLeft = Math.max(8, Math.min(92, left));
  const clampedTop = Math.max(8, Math.min(92, top));

  return (
    <div
      className="bev-trail-dot"
      style={{ left: `${clampedLeft}%`, top: `${clampedTop}%` }}
    />
  );
}

function ObjectInspectorPopup({ object, onClose }) {
  const pos = object.fused_position || object.position_3d || [0, 0, 0];

  return (
    <div className="object-popup-card" onClick={(e) => e.stopPropagation()}>
      <div className="popup-card-header">
        <div>
          <div className="popup-obj-id">{object.object_id}</div>
          <div className="popup-obj-type">{object.type?.toUpperCase()}</div>
        </div>
        <button className="popup-close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="popup-coords-grid">
        <div className="coord-box">
          <span className="coord-lbl">X</span>
          <span className="coord-val">{pos[0].toFixed(2)}m</span>
        </div>
        <div className="coord-box">
          <span className="coord-lbl">Y</span>
          <span className="coord-val">{pos[1].toFixed(2)}m</span>
        </div>
        <div className="coord-box">
          <span className="coord-lbl">Z</span>
          <span className="coord-val">{pos[2].toFixed(2)}m</span>
        </div>
      </div>

      <div className="popup-trust-list">
        <div className="popup-trust-row">
          <span>Camera Trust</span>
          <strong>{Math.round((object.trust_scores?.camera || 0) * 100)}%</strong>
        </div>
        <div className="popup-trust-row">
          <span>LiDAR Trust</span>
          <strong>{Math.round((object.trust_scores?.lidar || 0) * 100)}%</strong>
        </div>
        <div className="popup-trust-row">
          <span>Radar Trust</span>
          <strong>{Math.round((object.trust_scores?.radar || 0) * 100)}%</strong>
        </div>
      </div>

      <div className="popup-conf-row">
        <span>Scene Confidence</span>
        <strong>{Math.round((object.scene_confidence || 0) * 100)}%</strong>
      </div>

      {object.anomaly?.flag && (
        <div className="popup-anomaly-banner">
          ⚠ {object.anomaly.sensor?.toUpperCase()} ANOMALY DETECTED
        </div>
      )}
    </div>
  );
}

/* Math / Computation helpers */

function getAverageTrust(objects, sensor) {
  if (!objects || objects.length === 0) return 0.9;
  const total = objects.reduce(
    (sum, obj) => sum + (obj.trust_scores?.[sensor] || 0),
    0,
  );
  return total / objects.length;
}

function getAverageSceneConfidence(objects) {
  if (!objects || objects.length === 0) return 0.92;
  const total = objects.reduce(
    (sum, obj) => sum + (obj.scene_confidence || 0),
    0,
  );
  return total / objects.length;
}

function getFusionWeights(objects) {
  const cameraTrust = getAverageTrust(objects, "camera");
  const lidarTrust = getAverageTrust(objects, "lidar");
  const radarTrust = getAverageTrust(objects, "radar");

  const total = cameraTrust + lidarTrust + radarTrust;
  if (total === 0) return { camera: 0.33, lidar: 0.33, radar: 0.34 };

  return {
    camera: cameraTrust / total,
    lidar: lidarTrust / total,
    radar: radarTrust / total,
  };
}
