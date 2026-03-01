// utils/PoseDetector.ts
import { TensorflowModel } from "react-native-fast-tflite";
import { KEYPOINT_NAMES, KeypointName, Keypoint, Pose } from "./keypoints";

export type { KeypointName, Keypoint, Pose } from "./keypoints";
export { KEYPOINT_NAMES } from "./keypoints";

export function parsePoseOutput(output: Float32Array): Pose | null {
  if (!output || output.length < 51) return null; // 17 keypoints * 3 values

  const keypoints: Keypoint[] = [];

  for (let i = 0; i < 17; i++) {
    const y = output[i * 3]; // normalized 0-1
    const x = output[i * 3 + 1]; // normalized 0-1
    const score = output[i * 3 + 2];

    keypoints.push({
      x,
      y,
      score,
      name: KEYPOINT_NAMES[i] as KeypointName,
    });
  }

  const score = keypoints.reduce((sum, kp) => sum + kp.score, 0) / 17;

  return { keypoints, score };
}

// Use this in your frame processor
export function runPoseDetection(
  model: TensorflowModel,
  frame: any,
): Pose | null {
  "worklet";
  const outputs = model.runSync([frame]);
  return parsePoseOutput(outputs[0] as Float32Array);
}
