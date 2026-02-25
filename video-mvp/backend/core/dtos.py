from dataclasses import dataclass, asdict
from typing import Tuple, List, Optional


@dataclass
class DetectionBox:
    x1: float  # pixel coordinates
    y1: float
    x2: float
    y2: float
    confidence: float

    def to_dict(self):
        return asdict(self)


@dataclass
class CropResult:
    frame_index: int
    timestamp: float
    detection_box: Optional[DetectionBox]
    crop_window: Optional[Tuple[int, int, int, int]]  # x1,y1,x2,y2 in pixels
    confidence: float
    subject_detected: bool

    def to_dict(self):
        d = asdict(self)
        if self.detection_box:
            d["detection_box"] = self.detection_box.to_dict()
        return d


@dataclass
class VideoMetadata:
    width: int
    height: int
    fps: float
    duration: Optional[float] = None


@dataclass
class SelectionRect:
    # normalized coordinates (0..1) relative to frame
    cx: float
    cy: float
    w: float
    h: float


@dataclass
class AnalysisRequest:
    video_id: str
    video_metadata: VideoMetadata
    timestamp_sec: float
    selection_rect: SelectionRect
    options: dict = None


@dataclass
class AnalysisResponse:
    subject_id: str
    original_video: VideoMetadata
    crop_results: List[CropResult]
    meta: dict
