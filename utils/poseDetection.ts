// CRITICAL: Import setup FIRST before TensorFlow.js
// This ensures the environment is configured before TensorFlow.js initializes
import './tfjsSetup';

// Now import TensorFlow.js - it should detect browser/React Native environment
import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

// MoveNet keypoint indices (17 keypoints)
export const KEYPOINT_NAMES = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
] as const;

export type KeypointName = typeof KEYPOINT_NAMES[number];

export interface Keypoint {
  x: number;
  y: number;
  score: number;
  name: KeypointName;
}

export interface Pose {
  keypoints: Keypoint[];
  score: number;
}

export interface ShoulderAngle {
  left: number | null;
  right: number | null;
}

export class PoseDetector {
  private detector: poseDetection.PoseDetector | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      console.log('Initializing TensorFlow.js...');
      
      // Initialize TensorFlow.js for React Native
      // @tensorflow/tfjs-react-native handles all the platform setup
      await tf.ready();
      console.log('TensorFlow.js ready');

      // Create MoveNet detector
      console.log('Loading MoveNet Lightning model...');
      const model = poseDetection.SupportedModels.MoveNet;
      const detectorConfig = {
        modelType: 'SinglePose.Lightning' as const,
        enableSmoothing: true,
      };

      this.detector = await poseDetection.createDetector(model, detectorConfig);
      console.log('MoveNet detector loaded successfully');
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize pose detector:', error);
      throw error;
    }
  }

  async detectPose(imageInput: tf.Tensor3D | string | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | { data: Uint32Array; width: number; height: number }, options?: { width?: number; height?: number }): Promise<Pose | null> {
    if (!this.detector || !this.isInitialized) {
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
      } else if (typeof imageInput === 'object' && 'width' in imageInput && 'height' in imageInput) {
        imageWidth = imageInput.width;
        imageHeight = imageInput.height;
      } else if (imageInput instanceof HTMLImageElement || imageInput instanceof HTMLVideoElement) {
        imageWidth = imageInput.width;
        imageHeight = imageInput.height;
      } else if (imageInput instanceof HTMLCanvasElement) {
        imageWidth = imageInput.width;
        imageHeight = imageInput.height;
      } else if (imageInput instanceof ImageData) {
        imageWidth = imageInput.width;
        imageHeight = imageInput.height;
      }
      
      // Run pose detection - TensorFlow.js pose-detection accepts tensor input
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
      
      // MoveNet keypoint name mapping (MoveNet uses these exact names)
      const MOVENET_KEYPOINT_NAMES = [
        'nose',
        'left_eye',
        'right_eye',
        'left_ear',
        'right_ear',
        'left_shoulder',
        'right_shoulder',
        'left_elbow',
        'right_elbow',
        'left_wrist',
        'right_wrist',
        'left_hip',
        'right_hip',
        'left_knee',
        'right_knee',
        'left_ankle',
        'right_ankle',
      ];
      
      // Convert to our format
      // MoveNet returns normalized coordinates (0-1), convert to pixels
      const keypoints: Keypoint[] = pose.keypoints.map((kp, index) => {
        // MoveNet keypoints have a 'name' property, use it if available, otherwise use index
        const rawName = (kp as any).name;
        const kpName = rawName || MOVENET_KEYPOINT_NAMES[index] || KEYPOINT_NAMES[index] || 'unknown';
        
        // Check if coordinates are normalized (0-1) or already in pixels
        // MoveNet typically returns normalized coordinates
        const isNormalized = kp.x <= 1.0 && kp.y <= 1.0 && imageWidth > 0 && imageHeight > 0;
        
        // Convert normalized coordinates (0-1) to pixel coordinates
        const pixelX = isNormalized && imageWidth > 0 ? kp.x * imageWidth : kp.x;
        const pixelY = isNormalized && imageHeight > 0 ? kp.y * imageHeight : kp.y;
        
        const result = {
          x: pixelX,
          y: pixelY,
          score: kp.score || 0,
          name: (KEYPOINT_NAMES.includes(kpName as any) ? kpName : KEYPOINT_NAMES[index] || 'unknown') as KeypointName,
        };
        
        if (index < 3) {
          console.log(`Keypoint ${index} (${kpName}):`, {
            raw: { x: kp.x, y: kp.y, score: kp.score },
            converted: { x: pixelX, y: pixelY },
            isNormalized,
          });
        }
        
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
      this.isInitialized = false;
    }
  }
}
