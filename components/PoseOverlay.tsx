import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { Keypoint, ShoulderAngle } from '../utils/keypoints';
import { CONNECTIONS } from '@/utils/shoulderAngles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  if (!keypoints || keypoints.length === 0) {
    return null;
  }

  // Scale factor to map camera coordinates to screen coordinates
  const scaleX = cameraWidth > 0 ? SCREEN_WIDTH / cameraWidth : 1;
  const scaleY = cameraHeight > 0 ? SCREEN_HEIGHT / cameraHeight : 1;

  const getKeypoint = (name: string): Keypoint | undefined => {
    return keypoints.find((kp) => kp.name === name && kp.score > 0.15);
  };

  const visibleKeypoints = keypoints.filter((kp) => kp.score > 0.15);

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={styles.svg}>
        {/* Draw skeleton connections - THE VECTORS */}
        {CONNECTIONS.map(([start, end], index) => {
          const startKp = getKeypoint(start);
          const endKp = getKeypoint(end);

          if (!startKp || !endKp) return null;

          return (
            <Line
              key={`connection-${index}`}
              x1={startKp.x * scaleX}
              y1={startKp.y * scaleY}
              x2={endKp.x * scaleX}
              y2={endKp.y * scaleY}
              stroke="#00ff00"
              strokeWidth="4"
            />
          );
        })}

        {/* Draw keypoints */}
        {visibleKeypoints.map((keypoint) => {
          const isShoulder = keypoint.name === 'left_shoulder' || keypoint.name === 'right_shoulder';
          const isElbow = keypoint.name === 'left_elbow' || keypoint.name === 'right_elbow';
          const isWrist = keypoint.name === 'left_wrist' || keypoint.name === 'right_wrist';

          let color = '#00ff00';
          let radius = 5;

          if (isShoulder) {
            color = '#ff0000';
            radius = 8;
          } else if (isElbow) {
            color = '#ffff00';
            radius = 6;
          } else if (isWrist) {
            color = '#00ffff';
            radius = 6;
          }

          return (
            <Circle
              key={keypoint.name}
              cx={keypoint.x * scaleX}
              cy={keypoint.y * scaleY}
              r={radius}
              fill={color}
              stroke="#ffffff"
              strokeWidth="2"
            />
          );
        })}

        {/* Draw shoulder angle text */}
        {shoulderAngles.left !== null && (
          <SvgText
            x={SCREEN_WIDTH * 0.1}
            y={30}
            fill="#ffffff"
            fontSize="18"
            fontWeight="bold"
            stroke="#000000"
            strokeWidth="1"
          >
            Left: {shoulderAngles.left.toFixed(1)}°
          </SvgText>
        )}

        {shoulderAngles.right !== null && (
          <SvgText
            x={SCREEN_WIDTH * 0.6}
            y={30}
            fill="#ffffff"
            fontSize="18"
            fontWeight="bold"
            stroke="#000000"
            strokeWidth="1"
          >
            Right: {shoulderAngles.right.toFixed(1)}°
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
});
