import { useEffect, useRef, useState, useCallback } from 'react';
import { PoseDetector, Pose } from '../utils/poseDetection';
import { calculateBothShoulderAngles, ShoulderAngle } from '../utils/shoulderAngles';
import * as tf from '@tensorflow/tfjs';
import * as FileSystem from 'expo-file-system';
import * as jpeg from 'jpeg-js';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

interface UsePoseDetectionOptions {
  enabled?: boolean;
  frameInterval?: number; // Process every Nth frame
}

export function usePoseDetection({
  enabled = true,
  frameInterval = 3, // Process every 3rd frame for performance
}: UsePoseDetectionOptions) {
  const [pose, setPose] = useState<Pose | null>(null);
  const [shoulderAngles, setShoulderAngles] = useState<ShoulderAngle>({
    left: null,
    right: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const detectorRef = useRef<PoseDetector | null>(null);
  const frameCountRef = useRef(0);

  // Initialize detector
  useEffect(() => {
    if (!enabled) return;

    const initDetector = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const detector = new PoseDetector();
        await detector.initialize();
        detectorRef.current = detector;
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize pose detector';
        setError(errorMessage);
        setIsLoading(false);
        console.error('Pose detector initialization error:', err);
      }
    };

    initDetector();

    return () => {
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
    };
  }, [enabled]);

  // Process frame from image URI
  const processFrame = useCallback(
    async (imageUri: string) => {
      console.log('processFrame called:', { enabled, hasDetector: !!detectorRef.current, isLoading, imageUri: imageUri?.substring(0, 50) });
      
      if (!enabled || !detectorRef.current || isLoading) {
        console.log('processFrame: Skipping - enabled:', enabled, 'detector:', !!detectorRef.current, 'isLoading:', isLoading);
        return;
      }

      frameCountRef.current++;
      
      // Skip frames for performance
      if (frameCountRef.current % frameInterval !== 0) {
        console.log('processFrame: Skipping frame', frameCountRef.current, 'mod', frameInterval);
        return;
      }

      console.log('processFrame: Processing frame', frameCountRef.current);

      try {
        // Resize image first to avoid creating huge tensors (3024x4032 = 48MB!)
        // MoveNet works best with smaller images anyway (256x256 or 512x512)
        const TARGET_SIZE = 512; // Resize to max 512px on longest side
        console.log('processFrame: Resizing image to', TARGET_SIZE, 'px...');
        
        const manipulatedImage = await manipulateAsync(
          imageUri,
          [{ resize: { width: TARGET_SIZE } }], // Resize to max width, maintain aspect ratio
          { compress: 0.8, format: SaveFormat.JPEG }
        );
        
        console.log('processFrame: Image resized:', {
          uri: manipulatedImage.uri.substring(0, 50),
          width: manipulatedImage.width,
          height: manipulatedImage.height,
        });
        
        // Read resized image as base64
        const base64 = await FileSystem.readAsStringAsync(manipulatedImage.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Convert base64 to Uint8Array
        const binaryString = atob(base64);
        const imageBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          imageBytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log('processFrame: Decoding JPEG, imageBytes length:', imageBytes.length);
        
        // Decode JPEG using jpeg-js
        let decoded;
        try {
          decoded = jpeg.decode(imageBytes, { useTArray: true });
          console.log('processFrame: JPEG decoded successfully');
        } catch (err) {
          console.error('processFrame: JPEG decode error:', err);
          throw err;
        }
        
        const { width, height, data } = decoded;
        console.log('processFrame: Decoded image:', { width, height, dataLength: data.length });
        
        // Image is already resized to 512px max, but we might want to resize tensor further for MoveNet
        // MoveNet works best with 192x192 or 256x256, but 512 should also work
        const TENSOR_TARGET_SIZE = 256; // Final size for MoveNet tensor
        const aspectRatio = width / height;
        let targetWidth = TENSOR_TARGET_SIZE;
        let targetHeight = TENSOR_TARGET_SIZE;
        
        if (aspectRatio > 1) {
          // Landscape
          targetHeight = Math.round(TENSOR_TARGET_SIZE / aspectRatio);
        } else {
          // Portrait
          targetWidth = Math.round(TENSOR_TARGET_SIZE * aspectRatio);
        }
        
        console.log('processFrame: Resizing to:', { targetWidth, targetHeight });
        
        // Convert RGBA Uint8Array to tensor
        console.log('processFrame: Creating imageTensor...');
        let imageTensor;
        try {
          imageTensor = tf.tensor3d(data, [height, width, 4]);
          console.log('processFrame: Created imageTensor:', imageTensor.shape);
        } catch (err) {
          console.error('processFrame: Failed to create imageTensor:', err);
          throw err;
        }
        
        // Extract RGB channels (remove alpha channel)
        console.log('processFrame: Extracting RGB channels...');
        let rgbTensor;
        try {
          rgbTensor = imageTensor.slice([0, 0, 0], [height, width, 3]);
          console.log('processFrame: Created rgbTensor:', rgbTensor.shape);
        } catch (err) {
          console.error('processFrame: Failed to create rgbTensor:', err);
          imageTensor.dispose();
          throw err;
        }
        
        // Clean up imageTensor immediately to free memory
        imageTensor.dispose();
        
        // Resize the tensor to target size
        console.log('processFrame: Resizing tensor from', rgbTensor.shape, 'to', [targetHeight, targetWidth]);
        let resizedTensor;
        try {
          resizedTensor = tf.image.resizeBilinear(rgbTensor, [targetHeight, targetWidth]);
          console.log('processFrame: Resized tensor:', resizedTensor.shape);
        } catch (err) {
          console.error('processFrame: Failed to resize tensor:', err);
          rgbTensor.dispose();
          throw err;
        }
        
        // Clean up rgbTensor immediately
        rgbTensor.dispose();
        
        // Clean up intermediate tensors
        imageTensor.dispose();
        rgbTensor.dispose();
        
        // Pass resized tensor to pose detection
        console.log('processFrame: Calling detectPose...');
        const detectedPose = await detectorRef.current.detectPose(resizedTensor, { width: targetWidth, height: targetHeight });
        console.log('processFrame: detectPose returned:', detectedPose ? 'pose found' : 'no pose');
        
        // Clean up resized tensor
        resizedTensor.dispose();
        
        if (detectedPose) {
          console.log('Pose detected:', detectedPose.keypoints.length, 'keypoints');
          console.log('Image dimensions:', width, 'x', height);
          console.log('Sample keypoint:', detectedPose.keypoints.find(kp => kp.name === 'left_shoulder'));
          setPose(detectedPose);
          
          // Calculate shoulder angles
          const angles = calculateBothShoulderAngles(detectedPose.keypoints);
          setShoulderAngles(angles);
          console.log('Shoulder angles:', angles);
        } else {
          console.log('No pose detected');
        }
      } catch (err) {
        console.error('Pose detection error:', err);
      }
    },
    [enabled, isLoading, frameInterval]
  );

  return {
    pose,
    shoulderAngles,
    isLoading,
    error,
    processFrame,
  };
}
