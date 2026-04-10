import mediapipe as mp
import numpy as np
from PIL import Image
import io
import base64
import os
from datetime import datetime
from sklearn.metrics.pairwise import cosine_similarity

mp_face_detection = mp.solutions.face_detection
mp_face_mesh = mp.solutions.face_mesh

PHOTOS_DIR = "/app/attendance_photos"
os.makedirs(PHOTOS_DIR, exist_ok=True)

def decode_image(image_data: str) -> np.ndarray:
    if "base64," in image_data:
        image_data = image_data.split("base64,")[1]
    img_bytes = base64.b64decode(image_data)
    img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    return np.array(img), img

def detect_face(image_array: np.ndarray) -> bool:
    with mp_face_detection.FaceDetection(
        model_selection=0,
        min_detection_confidence=0.85
    ) as detector:
        results = detector.process(image_array)
        return results.detections is not None and len(results.detections) > 0

def extract_face_encoding(image_array: np.ndarray) -> list:
    with mp_face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        min_detection_confidence=0.85
    ) as face_mesh:
        results = face_mesh.process(image_array)
        if not results.multi_face_landmarks:
            return None
        landmarks = results.multi_face_landmarks[0]
        encoding = []
        for lm in landmarks.landmark:
            encoding.extend([lm.x, lm.y, lm.z])
        return encoding

def verify_face(new_encoding: list, stored_encoding: list, threshold: float = 0.97) -> bool:
    new_arr = np.array(new_encoding).reshape(1, -1)
    stored_arr = np.array(stored_encoding).reshape(1, -1)
    similarity = cosine_similarity(new_arr, stored_arr)[0][0]
    return float(similarity) >= threshold

def save_attendance_photo(image_data: str, user_id: str, action: str) -> str:
    try:
        if "base64," in image_data:
            image_data = image_data.split("base64,")[1]
        img_bytes = base64.b64decode(image_data)
        ist_now = datetime.utcnow()
        from datetime import timedelta
        ist_now = ist_now + timedelta(hours=5, minutes=30)
        filename = f"{user_id}_{action}_{ist_now.strftime('%Y%m%d_%H%M%S')}.jpg"
        filepath = os.path.join(PHOTOS_DIR, filename)
        with open(filepath, 'wb') as f:
            f.write(img_bytes)
        return filename
    except Exception as e:
        print(f"Error saving photo: {e}")
        return None

def delete_old_photos():
    try:
        count = 0
        for filename in os.listdir(PHOTOS_DIR):
            filepath = os.path.join(PHOTOS_DIR, filename)
            if os.path.isfile(filepath):
                os.remove(filepath)
                count += 1
        print(f"Deleted {count} attendance photos")
        return count
    except Exception as e:
        print(f"Error deleting photos: {e}")
        return 0
