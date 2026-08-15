const API_URL = "http://127.0.0.1:8000";

export async function getScene(scenario = "normal") {
  const response = await fetch(`${API_URL}/scene?scenario=${scenario}`);

  if (!response.ok) {
    throw new Error("Failed to fetch scene");
  }

  return response.json();
}

export async function getSceneSequence(scenario = "normal", nFrames = 12) {
  const response = await fetch(
    `${API_URL}/scene/sequence?scenario=${scenario}&n_frames=${nFrames}`,
  );
  if (!response.ok) throw new Error("Failed to fetch scene sequence");
  return response.json();
}
