from typing import Iterable, List, Tuple, Optional, Any
import numpy as np
import cv2
import logging
import os
from dataclasses import dataclass

from .dtos import AnalysisRequest, AnalysisResponse, CropResult, SelectionRect
from .stabilizer import Stabilizer
from .calculator import compute_9_16_window

logger = logging.getLogger(__name__)

class FaceRecognizer:
    """Wrapper for OpenCV's built-in DNN Face Detection (YuNet) and Recognition (SFace)."""
    def __init__(self):
        models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
        yunet_path = os.path.join(models_dir, "face_detection_yunet_2023mar.onnx")
        sface_path = os.path.join(models_dir, "face_recognition_sface_2021dec.onnx")
        
        if not os.path.exists(yunet_path) or not os.path.exists(sface_path):
            logger.error("Missing ONNX models for YuNet or SFace in backend/models/")
            self.detector = None
            self.recognizer = None
            return
            
        self.detector = cv2.FaceDetectorYN_create(yunet_path, "", (320, 320), score_threshold=0.6, backend_id=cv2.dnn.DNN_BACKEND_OPENCV, target_id=cv2.dnn.DNN_TARGET_CPU)
        self.recognizer = cv2.FaceRecognizerSF_create(sface_path, "")

    def extract_face(self, frame: np.ndarray, box: Tuple[int, int, int, int]) -> Optional[Any]:
        """Finds the best face inside a given bounding box using YuNet."""
        if not self.detector:
            return None
            
        x1, y1, x2, y2 = box
        h, w = frame.shape[:2]
        
        # Add margin to give the face detector context
        mx = int((x2 - x1) * 0.2)
        my = int((y2 - y1) * 0.2)
        cx1, cy1 = max(0, x1 - mx), max(0, y1 - my)
        cx2, cy2 = min(w, x2 + mx), min(h, y2 + my)
        
        crop = frame[cy1:cy2, cx1:cx2]
        if crop.size == 0:
            return None
            
        # YuNet requires the input size to be set
        self.detector.setInputSize((crop.shape[1], crop.shape[0]))
        _, faces = self.detector.detect(crop)
        
        if faces is None or len(faces) == 0:
            return None
            
        # Return the most confident face
        # faces is a 2D array where each row is a face: [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
        best_face = max(faces, key=lambda f: f[-1])
        
        # Adjust face coordinates back to original frame
        best_face[0] += cx1
        best_face[1] += cy1
        # landmarks
        for i in range(4, 14, 2):
            best_face[i] += cx1
            best_face[i+1] += cy1
            
        return best_face

    def get_embedding(self, frame: np.ndarray, face_data: Any) -> Optional[np.ndarray]:
        """Aligns the face and extracts the 128D biometric vector using SFace."""
        if not self.recognizer or face_data is None:
            return None
            
        # Align face based on landmarks
        aligned_face = self.recognizer.alignCrop(frame, face_data)
        # Extract feature vector
        feature = self.recognizer.feature(aligned_face)
        return feature

    def compare(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """Compare two embeddings using Cosine Similarity. 1.0 is identical."""
        if emb1 is None or emb2 is None:
            return 0.0
            
        score = self.recognizer.match(emb1, emb2, cv2.FaceRecognizerSF_FR_COSINE)
        # SFace cosine returns ~0.363 for threshold. We normalize it loosely to 0-1 for logic.
        # Generally, score >= 0.36 means same person.
        return float(score)

def _center_in_rect(box, rect_px) -> bool:
    cx = (box.x1 + box.x2) / 2.0
    cy = (box.y1 + box.y2) / 2.0
    x1, y1, x2, y2 = rect_px
    return (cx >= x1) and (cx <= x2) and (cy >= y1) and (cy <= y2)

def _iou(box, rect_px) -> float:
    xa = max(box.x1, rect_px[0])
    ya = max(box.y1, rect_px[1])
    xb = min(box.x2, rect_px[2])
    yb = min(box.y2, rect_px[3])
    inter_w = max(0, xb - xa)
    inter_h = max(0, yb - ya)
    inter_area = inter_w * inter_h
    box_area = max(0, box.x2 - box.x1) * max(0, box.y2 - box.y1)
    rect_area = max(0, rect_px[2] - rect_px[0]) * max(0, rect_px[3] - rect_px[1])
    union = box_area + rect_area - inter_area
    if union <= 0:
        return 0.0
    return float(inter_area) / float(union)

class HybridTrackerEngine:
    def __init__(self, stabilizer: Optional[Stabilizer] = None, options: dict = None):
        self.stabilizer = stabilizer or Stabilizer(alpha=options.get("smoothing_alpha", 0.15) if options else 0.15)
        self.options = options or {}
        
        self.fr = FaceRecognizer()
        
        self.state = 0 # 0: PENDING, 1: INIT, 2: TRACKING, 3: LOST & SEARCHING
        self.tracker = None
        self.target_embedding = None
        self.last_known_box = None
        self.frames_since_lost = 0

    def _denormalize_rect(self, rect: SelectionRect, vw: int, vh: int) -> Tuple[int, int, int, int]:
        sel_w_px = rect.w * vw
        sel_h_px = rect.h * vh
        x1 = int(round((rect.cx * vw) - sel_w_px / 2.0))
        y1 = int(round((rect.cy * vh) - sel_h_px / 2.0))
        x2 = int(round(x1 + sel_w_px))
        y2 = int(round(y1 + sel_h_px))
        return max(0, x1), max(0, y1), min(vw, x2), min(vh, y2)

    def analyze(self, frames: Iterable[Tuple[int, float, np.ndarray]], request: AnalysisRequest) -> AnalysisResponse:
        crop_results: List[CropResult] = []
        target_timestamp = getattr(request, "timestamp_sec", 0.0)
        vw, vh = request.video_metadata.width, request.video_metadata.height

        for frame_index, timestamp, frame in frames:
            if self.state == 0:
                if timestamp < target_timestamp - 0.1:
                    crop_results.append(self._empty_crop(frame_index, timestamp))
                    continue
                else:
                    self.state = 1

            if self.state == 1:
                if getattr(request, "selection_rect", None):
                    x1, y1, x2, y2 = self._denormalize_rect(request.selection_rect, vw, vh)
                    
                    if x2 <= x1 or y2 <= y1:
                        logger.error("Invalid selection box.")
                        crop_results.append(self._empty_crop(frame_index, timestamp))
                        continue

                    # ESTADO 1: Extraer firma biométrica
                    face_data = self.fr.extract_face(frame, (x1, y1, x2, y2))
                    if face_data is not None:
                        self.target_embedding = self.fr.get_embedding(frame, face_data)
                        logger.info("Biometric vector extracted successfully.")
                    else:
                        logger.warning("No face found in selection. CSRT will track blindly.")
                    
                    # Init CSRT (Slow but accurate for initial lock)
                    self.tracker = cv2.TrackerCSRT_create()
                    self.tracker.init(frame, (x1, y1, x2 - x1, y2 - y1))
                    self.last_known_box = (x1, y1, x2, y2)
                    self.state = 2
                    
                    crop_results.append(self._make_crop(frame_index, timestamp, self.last_known_box, vw, vh, 1.0))
                else:
                    crop_results.append(self._empty_crop(frame_index, timestamp))

            elif self.state == 2:
                # ESTADO 2: Tracking Rápido (KCF)
                success, bbox = self.tracker.update(frame)
                
                if success:
                    x, y, w, h = [int(v) for v in bbox]
                    
                    # VALIDATION: Prevent tracker from drifting.
                    # Check every 5 frames (Ultra-fast detection) to confirm target.
                    if self.target_embedding is not None and frame_index % 5 == 0:
                        cand_face = self.fr.extract_face(frame, (x, y, x+w, y+h))
                        if cand_face is not None:
                            cand_emb = self.fr.get_embedding(frame, cand_face)
                            sim = self.fr.compare(self.target_embedding, cand_emb)
                            if sim < 0.28: # Slightly higher threshold for precision
                                logger.info(f"Frame {frame_index}: Scene cut or drift detected (Sim: {sim:.2f}).")
                                success = False

                if success and w > 0 and h > 0 and x < vw and y < vh:
                    x2, y2 = min(vw, x + w), min(vh, y + h)
                    x, y = max(0, x), max(0, y)
                    self.last_known_box = (x, y, x2, y2)
                    self.frames_since_lost = 0
                    crop_results.append(self._make_crop(frame_index, timestamp, self.last_known_box, vw, vh, 1.0))
                else:
                    # If lost, don't wait. Search immediately.
                    self.state = 3
                    self.frames_since_lost = 1
                    crop_results.append(self._empty_crop(frame_index, timestamp))

            elif self.state == 3:
                # ESTADO 3: LOST & SEARCHING
                self.frames_since_lost += 1
                
                # Check every 3 frames for immediate recovery after a cut
                if self.frames_since_lost % 3 == 0 and self.target_embedding is not None and self.fr.detector:
                    self.fr.detector.setInputSize((vw, vh))
                    _, faces = self.fr.detector.detect(frame)
                    
                    match_found = False
                    if faces is not None:
                        for face in faces:
                            cand_emb = self.fr.get_embedding(frame, face)
                            similarity = self.fr.compare(self.target_embedding, cand_emb)
                            
                            if similarity > 0.36:
                                logger.info(f"Frame {frame_index}: Target RE-IDENTIFIED! Sim: {similarity:.3f}")
                                match_found = True
                                
                                fx, fy, fw, fh = [int(v) for v in face[:4]]
                                bx = max(0, fx - fw)
                                by = max(0, fy - fh)
                                bw = min(vw - bx, fw * 3)
                                bh = min(vh - by, fh * 5)
                                
                                # Use KCF for fast re-tracking
                                self.tracker = cv2.TrackerKCF_create()
                                self.tracker.init(frame, (bx, by, bw, bh))
                                self.last_known_box = (bx, by, bx+bw, by+bh)
                                self.state = 2
                                
                                crop_results.append(self._make_crop(frame_index, timestamp, self.last_known_box, vw, vh, similarity))
                                break
                    
                    if not match_found:
                        crop_results.append(self._empty_crop(frame_index, timestamp))
                else:
                    crop_results.append(self._empty_crop(frame_index, timestamp))

        return AnalysisResponse(subject_id="unknown", original_video=request.video_metadata, crop_results=crop_results, meta={"smoothing_alpha": self.stabilizer.alpha})

    def _empty_crop(self, idx: int, ts: float) -> CropResult:
        return CropResult(frame_index=idx, timestamp=ts, detection_box=None, crop_window=None, confidence=0.0, subject_detected=False)

    def _make_crop(self, idx: int, ts: float, box: Tuple[int, int, int, int], vw: int, vh: int, conf: float) -> CropResult:
        from .dtos import DetectionBox
        det = DetectionBox(x1=float(box[0]), y1=float(box[1]), x2=float(box[2]), y2=float(box[3]), confidence=float(conf))
        sm_box = self.stabilizer.smooth(det)
        x1, y1, x2, y2 = compute_9_16_window(sm_box, vw, vh, expand_factor=self.options.get("expand_factor", 1.2))
        return CropResult(frame_index=idx, timestamp=ts, detection_box=sm_box, crop_window=(x1, y1, x2, y2), confidence=float(sm_box.confidence), subject_detected=True)
