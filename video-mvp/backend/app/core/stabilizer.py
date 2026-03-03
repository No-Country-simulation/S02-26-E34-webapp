from typing import Optional, Tuple
from .dtos import DetectionBox

BoxTuple = Tuple[float, float, float, float]


class Stabilizer:
    """
    Exponential smoothing stabilizer. Per-coordinate smoothing:
    s_t = alpha * x_t + (1-alpha) * s_{t-1}
    alpha in (0,1]
    """

    def __init__(self, alpha: float = 0.15):
        self.alpha = float(alpha)
        self._state: Optional[BoxTuple] = None

    def reset(self):
        self._state = None

    def smooth(self, box: DetectionBox) -> DetectionBox:
        w = max(1.0, float(box.x2 - box.x1))
        h = max(1.0, float(box.y2 - box.y1))
        cx = float(box.x1) + w / 2.0
        cy = float(box.y1) + h / 2.0
        
        cur = (cx, cy, w, h)
        if self._state is None:
            self._state = cur
            return box
            
        # Use main alpha for position (tracking movement)
        a_pos = self.alpha
        # Use a much smaller alpha for size to prevent the "breathing" effect (resizing)
        a_size = min(self.alpha * 0.2, 0.05)
        
        prev_cx, prev_cy, prev_w, prev_h = self._state
        
        new_cx = a_pos * cx + (1 - a_pos) * prev_cx
        new_cy = a_pos * cy + (1 - a_pos) * prev_cy
        new_w = a_size * w + (1 - a_size) * prev_w
        new_h = a_size * h + (1 - a_size) * prev_h
        
        self._state = (new_cx, new_cy, new_w, new_h)
        
        x1 = int(round(new_cx - new_w / 2.0))
        y1 = int(round(new_cy - new_h / 2.0))
        x2 = int(round(new_cx + new_w / 2.0))
        y2 = int(round(new_cy + new_h / 2.0))
        
        return DetectionBox(x1=x1, y1=y1, x2=x2, y2=y2, confidence=box.confidence)
