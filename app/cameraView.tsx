import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Dimensions } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { usePoseDetection } from "../hooks/usePoseDetection";
import PoseOverlay from "../components/PoseOverlay";
import * as tf from '@tensorflow/tfjs';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CameraViewScreen() {
  const { patientId, joint, side, movement } = useLocalSearchParams<{
    patientId?: string;
    joint?: string;
    side?: string;
    movement?: string;
  }>();

  const [facing, setFacing] = useState<CameraType>("front"); // Front camera for self-facing pose detection
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraDimensions, setCameraDimensions] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
  const cameraRef = useRef<any>(null);
  const frameProcessingRef = useRef(false);
  const [tfReady, setTfReady] = useState(false);

  // Initialize TensorFlow.js
  useEffect(() => {
    const initTF = async () => {
      try {
        await tf.ready();
        setTfReady(true);
        console.log("✅ TensorFlow.js ready");
      } catch (error) {
        console.error("❌ TensorFlow.js initialization error:", error);
      }
    };
    initTF();
  }, []);

  // Initialize pose detection (no model path needed - TensorFlow.js downloads automatically)
  const { pose, shoulderAngles, isLoading: poseLoading, error: poseError, processFrame } = usePoseDetection({
    enabled: tfReady,
    frameInterval: 3, // Process every 3rd frame
  });

  const handleCameraReady = useCallback(() => {
    console.log("Camera ready");
  }, []);

  // Capture frame from camera and process with TensorFlow.js
  const captureFrame = useCallback(async () => {
    console.log('captureFrame called:', { hasCamera: !!cameraRef.current, processing: frameProcessingRef.current, hasProcessFrame: !!processFrame });
    
    if (!cameraRef.current || frameProcessingRef.current || !processFrame) {
      console.log('captureFrame: Skipping - camera:', !!cameraRef.current, 'processing:', frameProcessingRef.current, 'processFrame:', !!processFrame);
      return;
    }
    
    frameProcessingRef.current = true;
    try {
      console.log('captureFrame: Taking picture...');
      // Take a picture from the camera
      // Use lower quality and smaller size to reduce memory usage
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.3, // Lower quality to reduce size
        skipProcessing: false,
        // Note: expo-camera doesn't support direct resolution control,
        // but lower quality helps reduce file size
      });
      
      console.log('captureFrame: Photo taken:', { uri: photo?.uri?.substring(0, 50), width: photo?.width, height: photo?.height });
      
      if (photo) {
        setCameraDimensions({ width: photo.width || SCREEN_WIDTH, height: photo.height || SCREEN_HEIGHT });
        
        // Process the image URI with TensorFlow.js
        console.log('captureFrame: Calling processFrame...');
        await processFrame(photo.uri);
      }
    } catch (error) {
      console.error("Frame capture error:", error);
    } finally {
      frameProcessingRef.current = false;
    }
  }, [processFrame]);

  // Set up periodic frame capture for real-time pose detection
  useEffect(() => {
    if (!tfReady || poseLoading) return;

    const interval = setInterval(() => {
      captureFrame();
    }, 300); // Capture every 300ms (~3 FPS for processing)

    return () => clearInterval(interval);
  }, [tfReady, poseLoading, captureFrame]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1e88e5" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  const isLoading = !tfReady || poseLoading;

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        onCameraReady={handleCameraReady}
      />
      
      {/* Always visible test overlay */}
      <View style={{ position: 'absolute', top: 50, left: 10, backgroundColor: 'red', padding: 10, zIndex: 9999 }}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>TEST OVERLAY</Text>
        <Text style={{ color: 'white' }}>Pose: {pose ? 'YES' : 'NO'}</Text>
        <Text style={{ color: 'white' }}>PoseLoading: {poseLoading ? 'YES' : 'NO'}</Text>
        <Text style={{ color: 'white' }}>Keypoints: {pose?.keypoints?.length || 0}</Text>
        <Text style={{ color: 'white' }}>Camera: {cameraDimensions.width}x{cameraDimensions.height}</Text>
      </View>
      
      {/* Debug info */}
      {pose && (
        <View style={{ position: 'absolute', top: 150, left: 10, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, zIndex: 999 }}>
          <Text style={{ color: 'white' }}>Pose detected: {pose.keypoints.length} keypoints</Text>
          <Text style={{ color: 'white' }}>Camera: {cameraDimensions.width}x{cameraDimensions.height}</Text>
          <Text style={{ color: 'white' }}>Loading: {poseLoading ? 'yes' : 'no'}</Text>
          <Text style={{ color: 'white' }}>Sample KP: {pose.keypoints[0]?.name} at ({pose.keypoints[0]?.x?.toFixed(1)}, {pose.keypoints[0]?.y?.toFixed(1)})</Text>
        </View>
      )}
      
      {/* Simple test overlay - always render */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,0,0,0.1)', zIndex: 1000, pointerEvents: 'none' }}>
        <View style={{ position: 'absolute', top: 100, left: 100, width: 50, height: 50, backgroundColor: 'blue' }} />
      </View>
      
      {/* Pose Overlay */}
      {pose && !poseLoading && (
        <PoseOverlay
          keypoints={pose.keypoints}
          shoulderAngles={shoulderAngles}
          cameraWidth={cameraDimensions.width}
          cameraHeight={cameraDimensions.height}
        />
      )}

      {/* Loading Indicator */}
      {(poseLoading || !tfReady) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>
            {!tfReady ? "Initializing TensorFlow.js..." : "Loading MoveNet model (first time only)..."}
          </Text>
        </View>
      )}

      {/* Error Display */}
      {poseError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>⚠️ Native Build Required</Text>
          <Text style={styles.errorSubtext}>
            {poseError.includes('native build') 
              ? 'This feature requires a development build with native code. Expo Go does not support native modules.'
              : poseError}
          </Text>
          <Text style={styles.errorInstructions}>
            To fix this, run:{'\n'}
            {'\n'}1. npx expo prebuild{'\n'}
            2. npx expo run:android{'\n'}
            {'\n'}Or: npx expo run:ios
          </Text>
        </View>
      )}

      {/* Info Display */}
      <View style={styles.infoContainer}>
        {joint && side && movement && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              {side === "links" ? "Linke" : "Rechte"} {joint} - {movement}
            </Text>
            {shoulderAngles.left !== null && (
              <Text style={styles.angleText}>
                Left Shoulder: {shoulderAngles.left.toFixed(1)}°
              </Text>
            )}
            {shoulderAngles.right !== null && (
              <Text style={styles.angleText}>
                Right Shoulder: {shoulderAngles.right.toFixed(1)}°
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
          <Text style={styles.text}>Flip Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 64,
    flexDirection: "row",
    backgroundColor: "transparent",
    width: "100%",
    paddingHorizontal: 64,
  },
  button: {
    flex: 1,
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: {
    color: "#ffffff",
    marginTop: 16,
    fontSize: 16,
  },
  errorOverlay: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: "rgba(255, 0, 0, 0.8)",
    padding: 16,
    borderRadius: 8,
    zIndex: 10,
  },
  errorText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  errorSubtext: {
    color: "#ffffff",
    fontSize: 14,
    marginBottom: 12,
  },
  errorInstructions: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "monospace",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    padding: 8,
    borderRadius: 4,
  },
  infoContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    zIndex: 5,
  },
  infoBox: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  angleText: {
    color: "#00ff00",
    fontSize: 14,
    marginTop: 4,
  },
});
