// hooks/usePoseDetection.ts
import { useState, useMemo, useRef } from "react";
import { useTensorflowModel } from "react-native-fast-tflite";
import { useFrameProcessor } from "react-native-vision-camera";
import { parsePoseOutput } from "@/utils/poseDetection";
import { resize } from "@/utils/resize";
import { Worklets } from "react-native-worklets-core";
import { Pose } from "@/utils/keypoints";

export function usePoseDetection() {
  const model = useTensorflowModel(require("../assets/models/4.tflite"));
  const [pose, setPose] = useState<Pose | null>(null);
  const [cameraDimensions, setCameraDimensions] = useState({
    width: 1,
    height: 1,
  });
  const frameCountRef = useRef(0);

  const setPoseJS = useMemo(() => Worklets.createRunOnJS(setPose), []);
  const setDimensionsJS = useMemo(
    () => Worklets.createRunOnJS(setCameraDimensions),
    [],
  );

  const frameProcessor = useFrameProcessor(
    (frame) => {
      "worklet";
      if (model.state !== "loaded" || !model.model) return;

      frameCountRef.current++;
      if (frameCountRef.current % 2 !== 0) return;

      const resized = resize(frame, 192, 192);
      const outputs = model.model.runSync([resized]);

      const result = parsePoseOutput(outputs[0] as Float32Array);
      if (result) {
        const shoulders = result.keypoints.filter(
          (kp) => kp.name === "left_shoulder" || kp.name === "right_shoulder",
        );
        console.log("cam:", frame.width, "x", frame.height);
        console.log("shoulders:", JSON.stringify(shoulders));

        setPoseJS(result);
        setDimensionsJS({ width: frame.width, height: frame.height });
      }
    },
    [model],
  );

  return {
    frameProcessor,
    pose,
    cameraDimensions,
    isReady: model.state === "loaded",
    frameCount: frameCountRef.current,
  };
}
