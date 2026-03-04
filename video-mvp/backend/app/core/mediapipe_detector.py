from typing import List, Optional
import os
import numpy as np
from pathlib import Path

import mediapipe as mp
try:
    from mediapipe.tasks.python import vision
    from mediapipe.tasks.python.core.base_options import BaseOptions
except Exception:
    vision = None
    BaseOptions = None

from .detector import Detector
from .dtos import DetectionBox


def _model_path_default() -> Optional[str]:
    """Resolve default path for pose_landmarker_full.task.

    Search order:
    1) MEDIAPIPE_MODEL_PATH env var (if file exists)
    2) <backend>/models/pose_landmarker_full.task
    3) <backend>/app/models/pose_landmarker_full.task
    4) <cwd>/models/pose_landmarker_full.task
    """
    model_name = "pose_landmarker_full.task"

    env_model_path = os.getenv("MEDIAPIPE_MODEL_PATH")
    if env_model_path and Path(env_model_path).exists():
        return str(Path(env_model_path).resolve())

    backend_root = Path(__file__).resolve().parents[2]
    candidates = [
        backend_root / "models" / model_name,
        backend_root / "app" / "models" / model_name,
        Path.cwd() / "models" / model_name,
    ]

    for candidate in candidates:
        if candidate.exists():
            return str(candidate.resolve())

    return None


class MediaPipeDetector(Detector):
    """MediaPipe Pose Landmarker detector using Tasks API.
    
    Uses the modern mediapipe.tasks.python.vision API for better compatibility
    and recommendations for production use.
    """

    def __init__(
        self,
        model_path: str = None,
        min_pose_detection_confidence: float = 0.5,
        min_pose_presence_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ):
        """
        Args:
            model_path: Path to pose_landmarker_full.task. If None, tries common project paths
            min_pose_detection_confidence: Confidence threshold for pose detection
            min_pose_presence_confidence: Confidence threshold for pose presence
            min_tracking_confidence: Confidence threshold for tracking
        """
        self.min_pose_detection_confidence = min_pose_detection_confidence
        self.min_pose_presence_confidence = min_pose_presence_confidence
        self.min_tracking_confidence = min_tracking_confidence
        self._landmarker = None

        if vision is None or BaseOptions is None:
            raise ImportError("mediapipe.tasks.python.vision is required for MediaPipeDetector")

        # Determine model path (expect a .task file provided in project paths)
        if model_path is None:
            model_path = _model_path_default()

        if model_path is None or not os.path.exists(model_path):
            raise FileNotFoundError(
                "Model file not found. Set MEDIAPIPE_MODEL_PATH or place "
                "pose_landmarker_full.task in backend/models/ or backend/app/models/."
            )

        running_mode_enum = vision.RunningMode.VIDEO

        options = vision.PoseLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=model_path),
            running_mode=running_mode_enum,
            num_poses=5,
            min_pose_detection_confidence=self.min_pose_detection_confidence,
            min_pose_presence_confidence=self.min_pose_presence_confidence,
            min_tracking_confidence=self.min_tracking_confidence,
        )
        self._landmarker = vision.PoseLandmarker.create_from_options(options)
        self._running_mode = running_mode_enum

    def detect(self, frame: np.ndarray, timestamp_ms: Optional[int] = None) -> List[DetectionBox]:
        """
        Input: BGR frame (np.ndarray, HxWx3).
        Output: list of DetectionBox in pixel coordinates (x1,y1,x2,y2).
        """
        if self._landmarker is None:
            return []

        h, w = frame.shape[:2]
        # Convert BGR to RGB
        rgb = np.ascontiguousarray(frame[:, :, ::-1], dtype=np.uint8)

        # Create MediaPipe image
        mp_image = mp.Image(mp.ImageFormat.SRGB, rgb)

        # Run detection depending on running mode
        if getattr(self, "_running_mode", None) == vision.RunningMode.VIDEO:
            if timestamp_ms is None:
                timestamp_ms = 0
            res = self._landmarker.detect_for_video(mp_image, int(timestamp_ms))
        else:
            res = self._landmarker.detect(mp_image)

        boxes: List[DetectionBox] = []
        if not res or not getattr(res, "pose_landmarks", None):
            return []

        for pose_landmarks in res.pose_landmarks:
            xs = []
            ys = []
            confs = []
            for lm in pose_landmarks:
                xs.append(lm.x)
                ys.append(lm.y)
                conf = getattr(lm, "presence", None)
                if conf is None:
                    conf = getattr(lm, "visibility", 1.0)
                confs.append(conf if conf is not None else 1.0)

            if not xs or not ys:
                continue

            x_min = max(0.0, min(xs))
            x_max = min(1.0, max(xs))
            
            y_min_raw = min(ys)
            y_max_raw = max(ys)
            
            # MediaPipe Pose only goes up to the eyes/ears. 
            # We add a 15% margin to the top to capture the full head/hair.
            box_h = y_max_raw - y_min_raw
            head_margin = box_h * 0.15
            
            y_min = max(0.0, y_min_raw - head_margin)
            y_max = min(1.0, y_max_raw)

            px1 = int(round(x_min * w))
            py1 = int(round(y_min * h))
            px2 = int(round(x_max * w))
            py2 = int(round(y_max * h))

            avg_conf = float(sum(confs) / len(confs)) if confs else 0.0
            boxes.append(DetectionBox(x1=px1, y1=py1, x2=px2, y2=py2, confidence=avg_conf))

        return boxes
