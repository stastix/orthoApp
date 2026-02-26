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
      if (!detectorRef.current?.isInitialized) return;

      try {
        const pixels = pixelArray instanceof Uint8Array
          ? pixelArray
          : new Uint8Array(pixelArray);

        const totalPixels = width * height;
        const expectedSize = totalPixels * 3;

        if (pixels.length < expectedSize * 0.9) {
          console.warn(`Buffer size mismatch: expected ${expectedSize}, got ${pixels.length}`);
          return;
        }

        // Fix 3: Use int32, keep values in [0–255] range
        const reshaped = new Int32Array(totalPixels * 3);
        for (let i = 0; i < totalPixels; i++) {
          const srcIdx = i * 3;
          if (srcIdx + 2 < pixels.length) {
            reshaped[srcIdx]     = pixels[srcIdx];
            reshaped[srcIdx + 1] = pixels[srcIdx + 1];
            reshaped[srcIdx + 2] = pixels[srcIdx + 2];
          }
        }

        // Fix 2: Build [1, 256, 256, 3] batched tensor directly
        const tensor = tf.tensor3d(reshaped, [height, width, 3], 'int32');
        const resized = tf.image.resizeBilinear(tensor, [256, 256]);
        tensor.dispose();
        const resizedInt = resized.cast('int32');
        resized.dispose();
        const batched = resizedInt.expandDims(0) as tf.Tensor4D; // [1, 256, 256, 3]
        resizedInt.dispose();

        // Pass original dimensions so detectPose can skip its normalization logic
        const detectedPose = await detectorRef.current.detectPose(batched, {
          width: 256,
          height: 256,
        });
        batched.dispose();

        if (detectedPose?.keypoints?.length) {
          // Fix 1: MoveNet already returns pixel coords in [0–256] space
          // Scale from 256x256 back to original frame dimensions
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
        } else {
          setPose(null);
        }
      } catch (err) {
        console.error('processFrame error:', err);
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
