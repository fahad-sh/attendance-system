import mediapipe as mp
import numpy as np
from PIL import Image
import io
import base64
from sklearn.metrics.pairwise import cosine_similarity

mp_face_detection = mp.solutions.face_detection
mp_face_mesh = mp.solutions.face_mesh

def decode_image(image_data: str) -> np.ndarray:
    """Convert base64 image string to numpy array"""
    if "base64," in image_data:
        image_data = image_data.split("base64,")[1]
    img_bytes = base64.b64decode(image_data)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(img)

def detect_face(image_array: np.ndarray) -> bool:
    """Check if a face is detected in the image"""
    with mp_face_detection.FaceDetection(
        model_selection=0,
        min_detection_confidence=0.7
    ) as detector:
        results = detector.process(image_array)
        return results.detections is not None and len(results.detections) > 0

def extract_face_encoding(image_array: np.ndarray) -> list:
    """Extract face landmark encoding using MediaPipe Face Mesh"""
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        min_detection_confidence=0.7
    ) as face_mesh:
        results = face_mesh.process(image_array)
        if not results.multi_face_landmarks:
            return None

        landmarks = results.multi_face_landmarks[0]
        encoding = []
        for lm in landmarks.landmark:
            encoding.extend([lm.x, lm.y, lm.z])

        return encoding

def verify_face(new_encoding: list, stored_encoding: list, threshold: float = 0.92) -> bool:
    """Compare two face encodings — returns True if same person"""
    new_arr = np.array(new_encoding).reshape(1, -1)
    stored_arr = np.array(stored_encoding).reshape(1, -1)
    similarity = cosine_similarity(new_arr, stored_arr)[0][0]
    return float(similarity) >= threshold
