// utils/usePoseDetection.ts
import { useTensorflowModel } from "react-native-fast-tflite";
import { useFrameProcessor } from "react-native-vision-camera";
import { runPoseDetection } from "../utils/poseDetection";

export function usePoseDetection() {
  const model = useTensorflowModel(require("../assets/models/movenet.tflite"));

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (model.state !== "loaded") return;

      const pose = runPoseDetection(model.model, frame);
      if (!pose) return;

      // use pose.keypoints here
      // e.g. pose.keypoints[0] = { x, y, score, name: 'nose' }
    },
    [model],
  );

  return { frameProcessor, isReady: model.state === "loaded" };
}
