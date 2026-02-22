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
    async (buffer: ArrayBuffer, width: number, height: number, pixelFormat: string) => {
      if (!detectorRef.current?.isInitialized) return;

      try {
        // Convert ArrayBuffer to Uint8Array
        const pixels = new Uint8Array(buffer);
        
        // Create tensor directly from RGB pixels
        // Frame is RGB format, so shape is [height, width, 3]
        const tensor = tf.tensor3d(pixels, [height, width, 3]);
        
        // Resize to 256x256 (MoveNet optimal)
        const resized = tf.image.resizeBilinear(tensor, [256, 256]);
        tensor.dispose();

        // MoveNet detects pose
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
          
          setPose(scaledPose);
          setShoulderAngles(calculateBothShoulderAngles(scaledPose.keypoints));
        }
      } catch {
        // Silent fail
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
