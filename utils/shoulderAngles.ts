import { Keypoint, ShoulderAngle } from './keypoints';

/**
 * Calculate the angle between three points in degrees
 */
function calculateAngle(
  point1: { x: number; y: number },
  point2: { x: number; y: number },
  point3: { x: number; y: number }
): number {
  // Vector from point2 to point1
  const vec1 = {
    x: point1.x - point2.x,
    y: point1.y - point2.y,
  };
  
  // Vector from point2 to point3
  const vec2 = {
    x: point3.x - point2.x,
    y: point3.y - point2.y,
  };
  
  // Calculate dot product
  const dotProduct = vec1.x * vec2.x + vec1.y * vec2.y;
  
  // Calculate magnitudes
  const mag1 = Math.sqrt(vec1.x * vec1.x + vec1.y * vec1.y);
  const mag2 = Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y);
  
  // Avoid division by zero
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  
  // Calculate angle in radians, then convert to degrees
  const cosAngle = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
  const angleRad = Math.acos(cosAngle);
  const angleDeg = (angleRad * 180) / Math.PI;
  
  return angleDeg;
}

/**
 * Get keypoint by name from pose keypoints
 */
function getKeypoint(keypoints: Keypoint[], name: string): Keypoint | null {
  return keypoints.find((kp) => kp.name === name && kp.score > 0.15) || null;
}

/**
 * Calculate shoulder flexion/abduction angle
 * For flexion: angle between shoulder-elbow-wrist (sagittal plane)
 * For abduction: angle between shoulder-elbow-wrist (frontal plane)
 */
export function calculateShoulderAngles(
  keypoints: Keypoint[],
  side: 'left' | 'right'
): ShoulderAngle {
  const shoulderName = side === 'left' ? 'left_shoulder' : 'right_shoulder';
  const elbowName = side === 'left' ? 'left_elbow' : 'right_elbow';
  const wristName = side === 'left' ? 'left_wrist' : 'right_wrist';
  const hipName = side === 'left' ? 'left_hip' : 'right_hip';

  const shoulder = getKeypoint(keypoints, shoulderName);
  const elbow = getKeypoint(keypoints, elbowName);
  const wrist = getKeypoint(keypoints, wristName);
  const hip = getKeypoint(keypoints, hipName);

  if (!shoulder || !elbow || !wrist || !hip) {
    return {
      left: side === 'left' ? null : null,
      right: side === 'right' ? null : null,
    };
  }

  // Calculate flexion angle (shoulder-elbow-wrist in vertical plane)
  // The angle represents how much the arm is raised
  const flexionAngle = calculateAngle(hip, shoulder, elbow);

  // Calculate abduction angle (shoulder-elbow-wrist in horizontal plane)
  // This is the angle in the frontal plane
  const abductionAngle = calculateAngle(
    { x: shoulder.x, y: 0 }, // Horizontal reference
    shoulder,
    elbow
  );

  // For shoulder movement, we typically want the angle between:
  // Shoulder (vertex) -> Elbow -> Wrist
  // This gives us the arm angle
  const armAngle = calculateAngle(shoulder, elbow, wrist);

  // The main shoulder angle is the angle between the torso and the arm
  // Using shoulder-hip line as reference and shoulder-elbow as the arm
  const shoulderAngle = calculateAngle(hip, shoulder, elbow);

  const result: ShoulderAngle = {
    left: null,
    right: null,
  };

  result[side] = shoulderAngle;

  return result;
}

/**
 * Calculate both left and right shoulder angles
 */
export function calculateBothShoulderAngles(keypoints: Keypoint[]): ShoulderAngle {
  const left = calculateShoulderAngles(keypoints, 'left');
  const right = calculateShoulderAngles(keypoints, 'right');

  return {
    left: left.left,
    right: right.right,
  };
}

/**
 * Get shoulder movement type based on angle changes
 */
export interface ShoulderMovement {
  side: 'left' | 'right';
  angle: number;
  movementType: 'flexion' | 'abduction' | 'rotation' | 'unknown';
  range: number; // Range of motion in degrees
}

export function analyzeShoulderMovement(
  currentAngle: number | null,
  previousAngle: number | null,
  side: 'left' | 'right'
): ShoulderMovement | null {
  if (currentAngle === null) {
    return null;
  }

  let movementType: 'flexion' | 'abduction' | 'rotation' | 'unknown' = 'unknown';
  let range = 0;

  if (previousAngle !== null) {
    range = Math.abs(currentAngle - previousAngle);
    
    // Simple heuristic: if angle increases significantly, it's likely flexion
    // This is a simplified version - in production, you'd analyze the 3D movement
    if (currentAngle > previousAngle + 10) {
      movementType = 'flexion';
    } else if (currentAngle < previousAngle - 10) {
      movementType = 'abduction';
    }
  }

  return {
    side,
    angle: currentAngle,
    movementType,
    range,
  };
}
 export const CONNECTIONS: Array<[string, string]> = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
  ['left_shoulder', 'left_ear'],
  ['right_shoulder', 'right_ear'],
  ['left_ear', 'nose'],
  ['right_ear', 'nose'],
];

 
