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
        
        # We will keep updating this 'tracker_rect' frame by frame
        tracker_rect_px: Optional[Tuple[int, int, int, int]] = None
        
        vw = request.video_metadata.width
        vh = request.video_metadata.height

        for frame_index, timestamp, frame in frames:
            # If we haven't reached the target timestamp, we yield empty results
            if timestamp < target_timestamp - 0.1:  # 100ms tolerance
                crop = CropResult(frame_index=frame_index, timestamp=timestamp, detection_box=None, crop_window=None, confidence=0.0, subject_detected=False)
                crop_results.append(crop)
                continue
                
            ts_ms = int(round(timestamp * 1000)) if timestamp is not None else None
            boxes = self.detector.detect(frame, timestamp_ms=ts_ms)
            
            if not boxes:
                crop = CropResult(frame_index=frame_index, timestamp=timestamp, detection_box=None, crop_window=None, confidence=0.0, subject_detected=False)
                crop_results.append(crop)
                continue

            best_box = None
            
            if not started_tracking:
                # FIRST FRAME of tracking: use the user's selection_rect
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
                        
                        if score > best_iou and (iou_val > 0.01 or is_inside):
                            best_iou = score
                            best_box = b
                    
                    if best_box is None:
                        crop = CropResult(frame_index=frame_index, timestamp=timestamp, detection_box=None, crop_window=None, confidence=0.0, subject_detected=False)
                        crop_results.append(crop)
                        continue
                        
                else:
                    best_box = max(boxes, key=lambda b: b.confidence)
                
                started_tracking = True
            
            else:
                # SUBSEQUENT FRAMES: Use Tracking with the previous frame's box
                best_score = -1.0
                prev_cx = (tracker_rect_px[0] + tracker_rect_px[2]) / 2.0
                prev_cy = (tracker_rect_px[1] + tracker_rect_px[3]) / 2.0
                
                for b in boxes:
                    iou_val = _iou(b, tracker_rect_px)
                    
                    # VERY STRICT: Must have at least 15% overlap with the previous frame's box
                    # This prevents the tracker from jumping to another person standing nearby
                    # when the main subject disappears.
                    if iou_val > 0.15:
                        if iou_val > best_score:
                            best_score = iou_val
                            best_box = b
                
                if best_box is None:
                    # Subject lost in this frame
                    # We don't update started_tracking = False, because if they reappear 
                    # in the exact same spot, we might want to pick them up again.
                    # Or we could just wait for them to reappear where they were lost.
                    crop = CropResult(frame_index=frame_index, timestamp=timestamp, detection_box=None, crop_window=None, confidence=0.0, subject_detected=False)
                    crop_results.append(crop)
                    continue
            
            # Update tracker rect for the NEXT frame to be the current subject's box
            tracker_rect_px = (best_box.x1, best_box.y1, best_box.x2, best_box.y2)

            # smooth
            sm_box = self.stabilizer.smooth(best_box)
            # compute 9:16
            x1, y1, x2, y2 = compute_9_16_window(sm_box, vw, vh, expand_factor=self.options.get("expand_factor", 1.2))
            crop = CropResult(frame_index=frame_index, timestamp=timestamp, detection_box=sm_box, crop_window=(x1, y1, x2, y2), confidence=sm_box.confidence, subject_detected=True)
            crop_results.append(crop)

        resp = AnalysisResponse(subject_id=subject_id, original_video=request.video_metadata, crop_results=crop_results, meta={"smoothing_alpha": self.stabilizer.alpha})
        return resp
