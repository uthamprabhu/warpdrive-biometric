import * as faceapi from "face-api.js";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";

let modelsLoaded = false;

export const loadFaceModels = async () => {
  if (modelsLoaded) {
    return;
  }

  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
};

export const getDescriptorFromVideo = async (
  video: HTMLVideoElement
): Promise<Float32Array | null> => {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    return null;
  }

  return detection.descriptor;
};

export const compareDescriptors = (
  target: Float32Array,
  candidate: Float32Array,
  threshold = 0.45
): { match: boolean; distance: number } => {
  const distance = faceapi.euclideanDistance(target, candidate);

  return {
    match: distance <= threshold,
    distance,
  };
};

