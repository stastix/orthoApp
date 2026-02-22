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

// MoveNet keypoint name mapping (MoveNet uses these exact names)
export const MOVENET_KEYPOINT_NAMES = [
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

