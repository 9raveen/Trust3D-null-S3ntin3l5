// A hook that fetches the frame sequence once, then steps through it on a
// timer — matches the backend's dt=0.5s default (500ms per frame).
import { useState, useEffect, useRef } from "react";
import { getSceneSequence } from "./api";

export function useSceneSequence(
  scenario,
  { frameIntervalMs = 500, loop = true } = {},
) {
  const [frames, setFrames] = useState([]);
  const [currentFrame, setCurrentFrame] = useState(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  // fetch the sequence whenever the scenario changes
  useEffect(() => {
    setLoading(true);
    setFrameIndex(0);
    getSceneSequence(scenario)
      .then((data) => {
        setFrames(data);
        setCurrentFrame(data[0] ?? null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("sequence fetch failed:", err);
        setLoading(false);
      });
  }, [scenario]);

  // animate through frames on an interval
  useEffect(() => {
    if (frames.length === 0) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setFrameIndex((prev) => {
        const next = prev + 1;
        if (next >= frames.length) {
          if (loop) {
            setCurrentFrame(frames[0]);
            return 0;
          } else {
            clearInterval(intervalRef.current);
            return prev;
          }
        }
        setCurrentFrame(frames[next]);
        return next;
      });
    }, frameIntervalMs);

    return () => clearInterval(intervalRef.current);
  }, [frames, frameIntervalMs, loop]);

  return { currentFrame, frameIndex, totalFrames: frames.length, loading };
}

// Example usage in your dashboard component — this is the part you adapt
// to your actual Three.js scene, the shape matters more than the exact code:
//
// function Dashboard() {
//   const [scenario, setScenario] = useState("normal");
//   const { currentFrame, frameIndex, totalFrames, loading } = useSceneSequence(scenario);
//
//   if (loading || !currentFrame) return <div>Loading sequence...</div>;
//
//   return (
//     <div>
//       <ScenarioSwitcher value={scenario} onChange={setScenario} />
//       <div>Frame {frameIndex + 1} / {totalFrames}</div>
//       <Scene3D objects={currentFrame.objects} />
//     </div>
//   );
// }
//
// Inside your Three.js object rendering (wherever you currently read
// obj.fused_position to place a box), add a second, visually distinct
// marker for obj.smoothed_position — e.g. fused_position as a solid box,
// smoothed_position as a thin wireframe or trail line. That contrast IS
// the demo: "raw fusion jitters, Kalman-smoothed trajectory doesn't."
//
// for (const obj of currentFrame.objects) {
//   updateMesh(obj.object_id + "_raw", obj.fused_position);
//   if (obj.smoothed_position) {
//     updateMesh(obj.object_id + "_smoothed", obj.smoothed_position);
//   }
// }
