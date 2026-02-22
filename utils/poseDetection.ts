// CRITICAL: Import setup FIRST before TensorFlow.js
// This ensures the environment is configured before TensorFlow.js initializes
import './tfjsSetup';

// Now import TensorFlow.js - it should detect browser/React Native environment
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { KEYPOINT_NAMES, MOVENET_KEYPOINT_NAMES, KeypointName, Keypoint, Pose } from './keypoints';

// Re-export types and constants for backward compatibility
export type { KeypointName, Keypoint, Pose } from './keypoints';
export { KEYPOINT_NAMES } from './keypoints';

// Singleton instance to prevent multiple model loads
let globalDetectorInstance: PoseDetector | null = null;

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

      // Create MoveNet detector
      console.log('Loading MoveNet Lightning model...');
      const model = poseDetection.SupportedModels.MoveNet;
      const detectorConfig = {
        modelType: 'SinglePose.Lightning' as const,
        enableSmoothing: true,
      };

      this.detector = await poseDetection.createDetector(model, detectorConfig);
      console.log('MoveNet detector loaded successfully');
      
      this._isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize pose detector:', error);
      throw error;
    }
  }

  async detectPose(
    imageInput: tf.Tensor3D | string | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | { data: Uint32Array; width: number; height: number },
    options?: { width?: number; height?: number }
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
      } else if (typeof imageInput === 'string') {
        // Image URI - use options for dimensions
        imageWidth = options?.width || 0;
        imageHeight = options?.height || 0;
      } else if (typeof imageInput === 'object' && 'width' in imageInput && 'height' in imageInput) {
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
      
      console.log('Raw MoveNet pose:', {
        keypointCount: pose.keypoints.length,
        firstKeypoint: pose.keypoints[0],
        imageDimensions: { width: imageWidth, height: imageHeight },
      });
      
      // Convert to our format
      // MoveNet returns normalized coordinates (0-1), convert to pixels
      const keypoints: Keypoint[] = pose.keypoints.map((kp, index) => {
        // MoveNet keypoints have a 'name' property, use it if available, otherwise use index
        const rawName = (kp as any).name;
        const kpName = rawName || MOVENET_KEYPOINT_NAMES[index] || KEYPOINT_NAMES[index] || 'unknown';
        
        // MoveNet returns normalized coordinates (0-1) when given a tensor
        // Convert to pixel coordinates in the tensor space
        const pixelX = imageWidth > 0 ? kp.x * imageWidth : kp.x;
        const pixelY = imageHeight > 0 ? kp.y * imageHeight : kp.y;
        
        const result = {
          x: pixelX,
          y: pixelY,
          score: kp.score || 0,
          name: (KEYPOINT_NAMES.includes(kpName as any) ? kpName : KEYPOINT_NAMES[index] || 'unknown') as KeypointName,
        };
        
        // No debug logs - just return the keypoint
        
        return result;
      });

      // Calculate overall pose score
      const score = keypoints.reduce((sum, kp) => sum + kp.score, 0) / keypoints.length;

      return {
        keypoints,
        score,
      };
    } catch (error) {
      console.error('Pose detection error:', error);
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
