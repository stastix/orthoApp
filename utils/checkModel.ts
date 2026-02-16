import * as FileSystem from 'expo-file-system';

const MODEL_NAME = 'movenet_lightning.tflite';

/**
 * Check if the MoveNet model exists and return its info
 */
export async function checkModelStatus(): Promise<{
  exists: boolean;
  path: string;
  size?: number;
  sizeMB?: string;
}> {
  const localUri = `${FileSystem.documentDirectory}${MODEL_NAME}`;
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  
  return {
    exists: fileInfo.exists || false,
    path: localUri,
    size: fileInfo.size,
    sizeMB: fileInfo.size ? (fileInfo.size / 1024 / 1024).toFixed(2) : undefined,
  };
}

/**
 * Get the model path if it exists
 */
export async function getModelPathIfExists(): Promise<string | null> {
  const status = await checkModelStatus();
  if (status.exists && status.size && status.size > 1000000) {
    return status.path;
  }
  return null;
}

