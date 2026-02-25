from typing import Iterable, List, Tuple, Optional
import numpy as np
from .dtos import AnalysisRequest, AnalysisResponse, CropResult, SelectionRect
from .detector import Detector
from .stabilizer import Stabilizer
from .calculator import compute_9_16_window


def _center_in_rect(box, rect_px) -> bool:
    cx = (box.x1 + box.x2) / 2.0
    cy = (box.y1 + box.y2) / 2.0
    x1, y1, x2, y2 = rect_px
    return (cx >= x1) and (cx <= x2) and (cy >= y1) and (cy <= y2)


def _iou(box, rect_px) -> float:
    # box: DetectionBox, rect_px: (x1,y1,x2,y2)
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


class CoreEngine:
    """
    Core analysis engine:
    - Accepts a frames iterator (yielding (frame_index, timestamp, frame_bgr))
    - Uses provided Detector implementation
    - Returns AnalysisResponse with per-frame CropResult
    """

    def __init__(self, detector: Detector, stabilizer: Stabilizer = None, options: dict = None):
        self.detector = detector
        self.stabilizer = stabilizer or Stabilizer(alpha=options.get("smoothing_alpha", 0.15) if options else 0.15)
        self.options = options or {}

    def analyze(self, frames: Iterable[Tuple[int, float, np.ndarray]], request: AnalysisRequest) -> AnalysisResponse:
        crop_results: List[CropResult] = []
        subject_id = "unknown"
        
        target_timestamp = getattr(request, "timestamp_sec", 0.0)
        started_tracking = False
        finished_tracking = False
        
        # Spatial tracker state
        tracker_rect_px: Optional[Tuple[float, float, float, float]] = None
        velocity_dx = 0.0
        velocity_dy = 0.0
        lost_frames = 0
        MAX_LOST_FRAMES = 30  # At 30fps, 1 second of complete occlusion/disappearance means we stop tracking
        
        vw = request.video_metadata.width
        vh = request.video_metadata.height

        for frame_index, timestamp, frame in frames:
            # If the subject is permanently lost, output empty crops for the rest of the video
            if finished_tracking:
                crop = CropResult(frame_index=frame_index, timestamp=timestamp, detection_box=None, crop_window=None, confidence=0.0, subject_detected=False)
                crop_results.append(crop)
                continue

            # Skip frames until we reach the exact moment the user selected
            if timestamp < target_timestamp - 0.1:  # 100ms tolerance
                crop = CropResult(frame_index=frame_index, timestamp=timestamp, detection_box=None, crop_window=None, confidence=0.0, subject_detected=False)
                crop_results.append(crop)
                continue
                
            ts_ms = int(round(timestamp * 1000)) if timestamp is not None else None
            boxes = self.detector.detect(frame, timestamp_ms=ts_ms)
            
            # Nobody in frame at all
            if not boxes:
                if started_tracking:
                    lost_frames += 1
                    if lost_frames > MAX_LOST_FRAMES:
                        finished_tracking = True
                    else:
                        # Predict next position based on inertia
                        x1, y1, x2, y2 = tracker_rect_px
                        tracker_rect_px = (x1 + velocity_dx, y1 + velocity_dy, x2 + velocity_dx, y2 + velocity_dy)
                
                crop = CropResult(frame_index=frame_index, timestamp=timestamp, detection_box=None, crop_window=None, confidence=0.0, subject_detected=False)
                crop_results.append(crop)
                continue

            best_box = None
            
            if not started_tracking:
                # FIRST FRAME: Check user coordinates strictly
                if getattr(request, "selection_rect", None):
                    sr: SelectionRect = request.selection_rect
                    sel_w_px = sr.w * vw
                    sel_h_px = sr.h * vh
                    sel_x1 = int(round((sr.cx * vw) - sel_w_px / 2.0))
                    sel_y1 = int(round((sr.cy * vh) - sel_h_px / 2.0))
                    sel_x2 = int(round(sel_x1 + sel_w_px))
                    sel_y2 = int(round(sel_y1 + sel_h_px))
                    user_rect_px = (sel_x1, sel_y1, sel_x2, sel_y2)
                    
                    best_iou = -1.0
                    for b in boxes:
                        iou_val = _iou(b, user_rect_px)
                        is_inside = _center_in_rect(b, user_rect_px)
                        score = iou_val + (0.1 if is_inside else 0.0)
                        
                        # Only accept if it overlaps or center is inside the user selection
                        if score > best_iou and (iou_val > 0.01 or is_inside):
                            best_iou = score
                            best_box = b
                    
                    # User clicked an empty space: ignore and wait
                    if best_box is None:
                        crop = CropResult(frame_index=frame_index, timestamp=timestamp, detection_box=None, crop_window=None, confidence=0.0, subject_detected=False)
                        crop_results.append(crop)
                        continue
                else:
                    best_box = max(boxes, key=lambda b: b.confidence)
                
                started_tracking = True
                tracker_rect_px = (float(best_box.x1), float(best_box.y1), float(best_box.x2), float(best_box.y2))
                lost_frames = 0
            
            else:
                # SUBSEQUENT FRAMES: Pure spatial tracking with velocity prediction
                best_score = -1.0
                
                # Where do we expect the person to be right now?
                pred_x1 = tracker_rect_px[0] + velocity_dx
                pred_y1 = tracker_rect_px[1] + velocity_dy
                pred_x2 = tracker_rect_px[2] + velocity_dx
                pred_y2 = tracker_rect_px[3] + velocity_dy
                pred_rect = (pred_x1, pred_y1, pred_x2, pred_y2)
                
                for b in boxes:
                    # How much does this person overlap with the PREDICTED position?
                    iou_val = _iou(b, pred_rect)
                    
                    # We ONLY accept boxes that physically overlap with where the person was heading
                    if iou_val > 0.1:
                        if iou_val > best_score:
                            best_score = iou_val
                            best_box = b
                
                if best_box is None:
                    # The subject was not found near their expected position
                    lost_frames += 1
                    if lost_frames > MAX_LOST_FRAMES:
                        finished_tracking = True
                    else:
                        # Keep moving the ghost box via inertia
                        tracker_rect_px = pred_rect
                        
                    crop = CropResult(frame_index=frame_index, timestamp=timestamp, detection_box=None, crop_window=None, confidence=0.0, subject_detected=False)
                    crop_results.append(crop)
                    continue
            
            # Subject successfully found/tracked
            if started_tracking and best_box is not None:
                # Calculate velocity based on actual movement
                if lost_frames == 0 and tracker_rect_px is not None:
                    new_dx = float(best_box.x1) - tracker_rect_px[0]
                    new_dy = float(best_box.y1) - tracker_rect_px[1]
                    # Smooth the velocity so it doesn't jitter
                    velocity_dx = (velocity_dx * 0.7) + (new_dx * 0.3)
                    velocity_dy = (velocity_dy * 0.7) + (new_dy * 0.3)
                
                lost_frames = 0
                tracker_rect_px = (float(best_box.x1), float(best_box.y1), float(best_box.x2), float(best_box.y2))

            # Smooth and output
            sm_box = self.stabilizer.smooth(best_box)
            x1, y1, x2, y2 = compute_9_16_window(sm_box, vw, vh, expand_factor=self.options.get("expand_factor", 1.2))
            crop = CropResult(frame_index=frame_index, timestamp=timestamp, detection_box=sm_box, crop_window=(x1, y1, x2, y2), confidence=sm_box.confidence, subject_detected=True)
            crop_results.append(crop)

        resp = AnalysisResponse(subject_id=subject_id, original_video=request.video_metadata, crop_results=crop_results, meta={"smoothing_alpha": self.stabilizer.alpha})
        return resp
