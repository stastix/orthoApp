// CRITICAL: Import setup FIRST before TensorFlow.js
// This ensures the environment is configured before TensorFlow.js initializes
import "./tfjsSetup";

// Import TensorFlow from our setup helper, which handles loading the
// appropriate build (web vs react-native) at runtime.
import { tf } from "./tfjsSetup";
import * as poseDetection from "@tensorflow-models/pose-detection";
import { Asset } from "expo-asset";
import {
  KEYPOINT_NAMES,
  MOVENET_KEYPOINT_NAMES,
  KeypointName,
  Keypoint,
  Pose,
} from "./keypoints";

// Re-export types and constants for backward compatibility
export type { KeypointName, Keypoint, Pose } from "./keypoints";
export { KEYPOINT_NAMES } from "./keypoints";

// Singleton instance to prevent multiple model loads

export class PoseDetector {
  private detector: poseDetection.PoseDetector | null = null;
  private _isInitialized = false;
  private static instance: PoseDetector | null = null;

  static getInstance(): PoseDetector {
    if (!PoseDetector.instance) {
      PoseDetector.instance = new PoseDetector();
    }
    return PoseDetector.instance;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<void> {
    try {
      // Initialize TensorFlow.js for React Native
      // @tensorflow/tfjs-react-native handles all the platform setup
      await tf.ready();

      // model.json and binary shards are bundled via Metro; require returns module IDs
      const modelJson = require("../assets/models/movenet/model.json");
      const shard1 = require("../assets/models/movenet/group1-shard1of2.bin");
      const shard2 = require("../assets/models/movenet/group1-shard2of2.bin");

      // use the React‑Native helper to create an IOHandler that understands
      // quantized weights and works with the native bundle.
      const ioHandler = tf.bundleResourceIO(modelJson, [shard1, shard2]);

      // --- sanity check: load the raw GraphModel and run a dummy prediction ---
      try {
        const model = await tf.loadGraphModel(ioHandler as any);
        const dummy = tf.zeros([1, 192, 192, 3], "int32");
        const output = (model.predict(dummy) as tf.Tensor) || null;
        if (output) {
          console.log("model.predict output shape:", output.shape);
          // Expected shape: [1,1,17,3]
          output.print();
          tf.dispose(output);
        }
        tf.dispose(dummy);
        // We don't dispose `model` because the detector will re-use it internally.
      } catch (e) {
        console.warn("GraphModel test failed:", e);
      }

      const detectorConfig = {
        modelType: "SinglePose.Lightning" as const,
        enableSmoothing: true,
        modelUrl: ioHandler,
      };

      this.detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig,
      );

      console.log("MoveNet loaded from local assets");
      this._isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize pose detector:", error);
      throw error;
    }
  }

  async detectPose(
    imageInput:
      | tf.Tensor3D
      | tf.Tensor4D
      | string
      | ImageData
      | HTMLImageElement
      | HTMLCanvasElement
      | HTMLVideoElement
      | { data: Uint32Array; width: number; height: number },
    options?: { width?: number; height?: number },
  ): Promise<Pose | null> {
    if (!this.detector || !this._isInitialized) {
      return null;
    }

    try {
      // Extract image dimensions
      let imageWidth = 0;
      let imageHeight = 0;

      if (imageInput instanceof tf.Tensor) {
        // Tensor shape is [height, width, channels]
        const shape = imageInput.shape;
        imageHeight = options?.height || shape[0];
        imageWidth = options?.width || shape[1];
      } else if (typeof imageInput === "string") {
        // Image URI - use options for dimensions
        imageWidth = options?.width || 0;
        imageHeight = options?.height || 0;
      } else if (
        typeof imageInput === "object" &&
        "width" in imageInput &&
        "height" in imageInput
      ) {
        imageWidth = (imageInput as { width: number }).width;
        imageHeight = (imageInput as { height: number }).height;
      }

      // MoveNet handles everything - just pass the input
      const poses = await this.detector.estimatePoses(imageInput as any);

      if (!poses || poses.length === 0) {
        return null;
      }

      // Get the first (most confident) pose
      const pose = poses[0];

      // Temporary: verify raw coords are pixel space, not normalized
      console.log("Raw keypoint sample:", pose.keypoints[0]);
      // Should look like: { x: 120, y: 45, score: 0.87, name: 'nose' }
      // NOT like: { x: 0.47, y: 0.17, ... }  ← that would mean normalized

      // Convert to our format
      // Fix 1: Trust the coordinates as-is — already in pixel space
      const keypoints: Keypoint[] = pose.keypoints.map((kp, index) => {
        const rawName = (kp as any).name;
        const kpName =
          rawName ||
          MOVENET_KEYPOINT_NAMES[index] ||
          KEYPOINT_NAMES[index] ||
          "unknown";

        return {
          x: kp.x,
          y: kp.y,
          score: kp.score || 0,
          name: (KEYPOINT_NAMES.includes(kpName as any)
            ? kpName
            : KEYPOINT_NAMES[index] || "unknown") as KeypointName,
        };
      });

      // Calculate overall pose score
      const score =
        keypoints.reduce((sum, kp) => sum + kp.score, 0) / keypoints.length;

      return {
        keypoints,
        score,
      };
    } catch (error) {
      console.error("Pose detection error:", error);
      return null;
    }
  }

  dispose(): void {
    if (this.detector) {
      this.detector.dispose();
      this.detector = null;
      this._isInitialized = false;
    }
  }
}
