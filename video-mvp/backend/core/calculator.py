from typing import Tuple
from .dtos import DetectionBox


def compute_9_16_window(box: DetectionBox, video_width: int, video_height: int, expand_factor: float = 1.2) -> Tuple[int, int, int, int]:
    """
    Given a detection box (pixel coords), compute a 9:16 window centered on the detection.
    - expand_factor: multiplier to enlarge the subject box before fitting into 9:16
    Returns clamped (x1,y1,x2,y2) in pixels.
    """
    box_w = max(1, box.x2 - box.x1)
    box_h = max(1, box.y2 - box.y1)

    # expand subject box
    cx = box.x1 + box_w / 2.0
    cy = box.y1 + box_h / 2.0
    target_aspect = 9.0 / 16.0  # width/height for 9:16 oriented vertical crop
    # compute desired height given expanded width or desired width given expanded height
    expanded_w = box_w * expand_factor
    expanded_h = box_h * expand_factor

    # Build window trying to respect subject size but enforcing 9:16 (w/h)
    # Decide base dimension by subject prominence
    # compute candidate using expanded_h as base:
    cand_h = max(expanded_h, 1.0)
    cand_w = cand_h * target_aspect
    if cand_w < expanded_w:
        # width requirement dominates
        cand_w = expanded_w
        cand_h = cand_w / target_aspect

    # final window size
    win_w = min(cand_w, video_width)
    win_h = min(cand_h, video_height)

    x1 = int(round(cx - win_w / 2.0))
    y1 = int(round(cy - win_h / 2.0))
    x2 = int(round(x1 + win_w))
    y2 = int(round(y1 + win_h))

    # clamp to video bounds
    if x1 < 0:
        x2 = min(video_width, x2 - x1)
        x1 = 0
    if y1 < 0:
        y2 = min(video_height, y2 - y1)
        y1 = 0
    if x2 > video_width:
        x1 = max(0, x1 - (x2 - video_width))
        x2 = video_width
    if y2 > video_height:
        y1 = max(0, y1 - (y2 - video_height))
        y2 = video_height

    return x1, y1, x2, y2
