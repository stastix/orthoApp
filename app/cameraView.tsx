import { useState, useEffect, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Dimensions, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { usePoseDetection } from "../hooks/usePoseDetection";
import PoseOverlay from "../components/PoseOverlay";
import { Camera, useCameraDevice, useFrameProcessor, useCameraPermission } from "react-native-vision-camera";
import { runOnJS } from "react-native-reanimated";
import * as tf from '@tensorflow/tfjs';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function CameraViewScreen() {
  const { joint, side, movement } = useLocalSearchParams<{
    joint?: string;
    side?: string;
    movement?: string;
  }>();

  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [cameraDimensions, setCameraDimensions] = useState({ width: SCREEN_WIDTH, height: SCREEN_HEIGHT });
  const [tfReady, setTfReady] = useState(false);
  const frameCountRef = useRef(0);

  // Request camera permission
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(facing);

  // Request permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission().then((granted) => {
        if (!granted) {
          Alert.alert(
            "Camera Permission Required",
            "This app needs camera access for pose detection. Please enable it in settings.",
            [{ text: "OK" }]
          );
        }
      });
    }
  }, [hasPermission, requestPermission]);

  // Initialize TensorFlow.js
  useEffect(() => {
    tf.ready().then(() => {
      setTfReady(true);
    }).catch(err => {
      console.error('TensorFlow error:', err);
    });
  }, []);

  // Initialize pose detection
  const { pose, shoulderAngles, isLoading: poseLoading, error: poseError, processFrame } = usePoseDetection({
    enabled: tfReady,
  });

  // REAL-TIME FRAME PROCESSOR - DIRECT PIXEL DATA, NO PHOTOS
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    try {
      frameCountRef.current++;
      // Process every 2nd frame (~15 FPS)
      if (frameCountRef.current % 2 !== 0) {
        return;
      }

      // Get pixel data directly from frame - NO JPEG, NO DISK I/O
      const buffer = frame.toArrayBuffer();
      const width = frame.width;
      const height = frame.height;

      // Update dimensions
      runOnJS(setCameraDimensions)({ width, height });

      // Process frame directly - MoveNet gets raw pixel data
      runOnJS(processFrame)(buffer, width, height, frame.pixelFormat);
    } catch {
      // Silent fail in worklet
    }
  }, [processFrame]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1e88e5" />
        <Text style={styles.message}>Requesting camera permission...</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1e88e5" />
        <Text style={styles.message}>No camera device found</Text>
        <Text style={styles.message}>Make sure your emulator has a camera configured</Text>
        <Text style={styles.message}>In Android Studio: Extended Controls → Camera → Webcam0</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        device={device}
        isActive={hasPermission && tfReady && !poseLoading}
        frameProcessor={frameProcessor}
        pixelFormat="rgb"
      />

      {/* POSE OVERLAY - REAL-TIME VECTORS */}
      {pose && pose.keypoints && pose.keypoints.length > 0 && (
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
            {!tfReady ? "Initializing TensorFlow.js..." : "Loading MoveNet model..."}
          </Text>
        </View>
      )}

      {/* Error Display */}
      {poseError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>⚠️ Error</Text>
          <Text style={styles.errorSubtext}>{poseError}</Text>
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
              <Text style={styles.angleText}>Left: {shoulderAngles.left.toFixed(1)}°</Text>
            )}
            {shoulderAngles.right !== null && (
              <Text style={styles.angleText}>Right: {shoulderAngles.right.toFixed(1)}°</Text>
            )}
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
          <Text style={styles.buttonText}>Flip Camera</Text>
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
    color: "#000",
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
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 16,
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
