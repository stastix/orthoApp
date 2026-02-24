import { useEffect, useRef, useState, useCallback } from 'react';
import { PoseDetector } from '../utils/poseDetection';
import { Pose, ShoulderAngle } from '../utils/keypoints';
import { calculateBothShoulderAngles } from '../utils/shoulderAngles';
import * as tf from '@tensorflow/tfjs';

interface UsePoseDetectionOptions {
  enabled?: boolean;
}

export function usePoseDetection({
  enabled = true,
}: UsePoseDetectionOptions) {
  const [pose, setPose] = useState<Pose | null>(null);
  const [shoulderAngles, setShoulderAngles] = useState<ShoulderAngle>({
    left: null,
    right: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detectorRef = useRef<PoseDetector | null>(null);

  // Initialize detector ONCE
  useEffect(() => {
    if (!enabled) return;

    const initDetector = async () => {
      try {
        if (detectorRef.current?.isInitialized) {
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        setError(null);
        
        const detector = PoseDetector.getInstance();
        
        if (!detector.isInitialized) {
          await detector.initialize();
        }
        
        detectorRef.current = detector;
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize pose detector';
        setError(errorMessage);
        setIsLoading(false);
        console.error('Detector error:', err);
      }
    };

    initDetector();
  }, [enabled]);

  // REAL-TIME: Process raw pixel buffer directly - NO JPEG, NO DISK I/O
  const processFrame = useCallback(
    async (pixelArray: number[] | Uint8Array, width: number, height: number, pixelFormat: string) => {
      if (!detectorRef.current?.isInitialized) {
        console.log('❌ processFrame: Detector not initialized');
        return;
      }

      try {
        // Convert array back to Uint8Array (worklets can't pass ArrayBuffer)
        const pixels = pixelArray instanceof Uint8Array 
          ? pixelArray 
          : new Uint8Array(pixelArray);
        
        console.log(`🔄 processFrame: ${width}x${height}, format: ${pixelFormat}, pixels: ${pixels.length} bytes`);
        const totalPixels = width * height;
        const expectedSize = totalPixels * 3; // RGB = 3 channels
        
        console.log(`📊 Buffer check: ${pixels.length} bytes, expected ${expectedSize} (${width}*${height}*3)`);
        
        if (pixels.length !== expectedSize) {
          console.warn(`⚠️ processFrame: Buffer size mismatch. Expected ${expectedSize}, got ${pixels.length}`);
          // Try to continue anyway if close
          if (pixels.length < expectedSize * 0.9) {
            return;
          }
        }
        
        // Reshape pixels from flat array to [height, width, 3]
        // Pixels are in RGB format: [R, G, B, R, G, B, ...]
        const reshaped = new Float32Array(totalPixels * 3);
        for (let i = 0; i < totalPixels; i++) {
          const srcIdx = i * 3;
          if (srcIdx + 2 < pixels.length) {
            reshaped[srcIdx] = pixels[srcIdx] / 255.0;     // R
            reshaped[srcIdx + 1] = pixels[srcIdx + 1] / 255.0; // G
            reshaped[srcIdx + 2] = pixels[srcIdx + 2] / 255.0; // B
          }
        }
        
        console.log(`📦 Creating tensor: [${height}, ${width}, 3]`);
        // Create tensor: [height, width, 3]
        const tensor = tf.tensor3d(reshaped, [height, width, 3]);
        
        // Resize to 256x256 (MoveNet optimal)
        console.log(`📏 Resizing to 256x256...`);
        const resized = tf.image.resizeBilinear(tensor, [256, 256]);
        tensor.dispose();

        // MoveNet detects pose
        console.log(`🔍 Detecting pose...`);
        const detectedPose = await detectorRef.current.detectPose(resized, { width: 256, height: 256 });
        resized.dispose();
        
        if (detectedPose && detectedPose.keypoints && detectedPose.keypoints.length > 0) {
          // Scale back to original size
          const scaleX = width / 256;
          const scaleY = height / 256;
          
          const scaledPose: Pose = {
            keypoints: detectedPose.keypoints.map(kp => ({
              ...kp,
              x: kp.x * scaleX,
              y: kp.y * scaleY,
            })),
            score: detectedPose.score,
          };
          
          console.log(`✅ Detected ${scaledPose.keypoints.length} keypoints, score: ${scaledPose.score.toFixed(3)}`);
          console.log(`📍 Sample keypoint: ${scaledPose.keypoints[0]?.name} at (${scaledPose.keypoints[0]?.x.toFixed(1)}, ${scaledPose.keypoints[0]?.y.toFixed(1)})`);
          setPose(scaledPose);
          setShoulderAngles(calculateBothShoulderAngles(scaledPose.keypoints));
        } else {
          console.log('❌ processFrame: No pose detected');
          setPose(null);
        }
      } catch (err) {
        console.error('❌ processFrame error:', err);
        setPose(null);
      }
    },
    []
  );

  return {
    pose,
    shoulderAngles,
    isLoading,
    error,
    processFrame,
  };
}
