import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { Keypoint, ShoulderAngle } from "../utils/keypoints";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface PoseOverlayProps {
  keypoints: Keypoint[];
  shoulderAngles: ShoulderAngle;
  cameraWidth: number;
  cameraHeight: number;
}

export default function PoseOverlay({
  keypoints,
  shoulderAngles,
  cameraWidth,
  cameraHeight,
}: PoseOverlayProps) {
  if (!keypoints || keypoints.length === 0) return null;
  const visibleKeypoints = keypoints.filter(
    (kp) =>
      (kp.name === "left_shoulder" || kp.name === "right_shoulder") &&
      kp.score > 0.15,
  );

  const isRotated = cameraWidth > cameraHeight;
  const mapX = (x: number, y: number) => (isRotated ? y : x) * SCREEN_WIDTH;
  const mapY = (x: number, y: number) =>
    (isRotated ? 1 - x : y) * SCREEN_HEIGHT;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={styles.svg}>
        {/* Debug: camera and screen dimensions */}
        <SvgText x={10} y={20} fill="#ff0000" fontSize="12">
          cam: {cameraWidth}x{cameraHeight} screen: {SCREEN_WIDTH}x
          {SCREEN_HEIGHT}
        </SvgText>

        {/* Debug: first 3 keypoint coordinates */}
        {visibleKeypoints.slice(0, 3).map((kp, i) => (
          <SvgText
            key={kp.name}
            x={10}
            y={40 + i * 20}
            fill="#ffff00"
            fontSize="12"
          >
            {kp.name}: x={kp.x.toFixed(2)} y={kp.y.toFixed(2)} s=
            {kp.score.toFixed(2)}
          </SvgText>
        ))}

        {/* Keypoint dots */}
        {visibleKeypoints.map((kp) => (
          <Circle
            key={kp.name}
            cx={mapX(kp.x, kp.y)}
            cy={mapY(kp.x, kp.y)}
            r={6}
            fill="#00ff00"
            stroke="#ffffff"
            strokeWidth="2"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  svg: { ...StyleSheet.absoluteFillObject },
});
