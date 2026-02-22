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

// Keypoint connections for drawing skeleton
export default function PoseOverlay({
  keypoints,
  shoulderAngles,
  cameraWidth,
  cameraHeight,
}: PoseOverlayProps) {
  // Debug logging
  console.log('PoseOverlay render:', {
    keypointCount: keypoints.length,
    cameraDimensions: { width: cameraWidth, height: cameraHeight },
    screenDimensions: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
    sampleKeypoint: keypoints.find(kp => kp.name === 'left_shoulder'),
  });

  // Scale factor to map camera coordinates to screen coordinates
  const scaleX = cameraWidth > 0 ? SCREEN_WIDTH / cameraWidth : 1;
  const scaleY = cameraHeight > 0 ? SCREEN_HEIGHT / cameraHeight : 1;

  const getKeypoint = (name: string): Keypoint | undefined => {
    const kp = keypoints.find((kp) => kp.name === name && kp.score > 0.3);
    if (!kp) {
      console.log(`Keypoint ${name} not found or low confidence`);
    }
    return kp;
  };

  // Filter keypoints with sufficient confidence
  const visibleKeypoints = keypoints.filter((kp) => kp.score > 0.3);

  console.log('Visible keypoints:', visibleKeypoints.length, 'out of', keypoints.length);

  // Always render something to test
  console.log('PoseOverlay render called:', {
    keypointCount: keypoints?.length || 0,
    cameraWidth,
    cameraHeight,
  });

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Test: Always show a red box to verify overlay renders */}
      <View style={{ position: 'absolute', top: 200, left: 200, width: 100, height: 100, backgroundColor: 'yellow', zIndex: 10000 }} />

      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={styles.svg}>
        {/* Test line from top-left to bottom-right - always visible */}
        <Line
          x1={0}
          y1={0}
          x2={SCREEN_WIDTH}
          y2={SCREEN_HEIGHT}
          stroke="#ff0000"
          strokeWidth="10"
        />

        {/* Test circle */}
        <Circle
          cx={SCREEN_WIDTH / 2}
          cy={SCREEN_HEIGHT / 2}
          r={50}
          fill="#00ff00"
          stroke="#000000"
          strokeWidth="5"
        />

        {/* Only render pose if we have keypoints */}
        {keypoints && keypoints.length > 0 && (
          <>
            {/* Draw skeleton connections */}
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
                  strokeWidth="2"
                />
              );
            })}

            {/* Draw keypoints */}
            {visibleKeypoints.map((keypoint) => {
              const isShoulder =
                keypoint.name === 'left_shoulder' || keypoint.name === 'right_shoulder';
              const isElbow =
                keypoint.name === 'left_elbow' || keypoint.name === 'right_elbow';
              const isWrist =
                keypoint.name === 'left_wrist' || keypoint.name === 'right_wrist';

              let color = '#00ff00';
              let radius = 4;

              if (isShoulder) {
                color = '#ff0000'; // Red for shoulders
                radius = 6;
              } else if (isElbow) {
                color = '#ffff00'; // Yellow for elbows
                radius = 5;
              } else if (isWrist) {
                color = '#00ffff'; // Cyan for wrists
                radius = 5;
              }

              return (
                <Circle
                  key={keypoint.name}
                  cx={keypoint.x * scaleX}
                  cy={keypoint.y * scaleY}
                  r={radius}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              );
            })}

            {/* Draw shoulder angle text */}
            {shoulderAngles.left !== null && (
              <>
                <SvgText
                  x={SCREEN_WIDTH * 0.1}
                  y={30}
                  fill="#ffffff"
                  fontSize="16"
                  fontWeight="bold"
                  stroke="#000000"
                  strokeWidth="0.5"
                >
                  Left: {shoulderAngles.left.toFixed(1)}°
                </SvgText>
                {/* Draw angle arc for left shoulder */}
                {(() => {
                  const leftShoulder = getKeypoint('left_shoulder');
                  const leftElbow = getKeypoint('left_elbow');
                  const leftHip = getKeypoint('left_hip');

                  if (leftShoulder && leftElbow && leftHip) {
                    // Draw a line from hip to shoulder to elbow to visualize the angle
                    return (
                      <>
                        <Line
                          x1={leftHip.x * scaleX}
                          y1={leftHip.y * scaleY}
                          x2={leftShoulder.x * scaleX}
                          y2={leftShoulder.y * scaleY}
                          stroke="#ff00ff"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                        <Line
                          x1={leftShoulder.x * scaleX}
                          y1={leftShoulder.y * scaleY}
                          x2={leftElbow.x * scaleX}
                          y2={leftElbow.y * scaleY}
                          stroke="#ff00ff"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                      </>
                    );
                  }
                  return null;
                })()}
              </>
            )}

            {shoulderAngles.right !== null && (
              <>
                <SvgText
                  x={SCREEN_WIDTH * 0.6}
                  y={30}
                  fill="#ffffff"
                  fontSize="16"
                  fontWeight="bold"
                  stroke="#000000"
                  strokeWidth="0.5"
                >
                  Right: {shoulderAngles.right.toFixed(1)}°
                </SvgText>
                {/* Draw angle arc for right shoulder */}
                {(() => {
                  const rightShoulder = getKeypoint('right_shoulder');
                  const rightElbow = getKeypoint('right_elbow');
                  const rightHip = getKeypoint('right_hip');

                  if (rightShoulder && rightElbow && rightHip) {
                    return (
                      <>
                        <Line
                          x1={rightHip.x * scaleX}
                          y1={rightHip.y * scaleY}
                          x2={rightShoulder.x * scaleX}
                          y2={rightShoulder.y * scaleY}
                          stroke="#ff00ff"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                        <Line
                          x1={rightShoulder.x * scaleX}
                          y1={rightShoulder.y * scaleY}
                          x2={rightElbow.x * scaleX}
                          y2={rightElbow.y * scaleY}
                          stroke="#ff00ff"
                          strokeWidth="2"
                          strokeDasharray="5,5"
                        />
                      </>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
});

