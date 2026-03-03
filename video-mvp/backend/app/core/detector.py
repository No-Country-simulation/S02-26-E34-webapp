from abc import ABC, abstractmethod
from typing import List, Optional
import numpy as np
from .dtos import DetectionBox


class Detector(ABC):
    """Detector strategy interface."""

    @abstractmethod
    def detect(self, frame: np.ndarray, timestamp_ms: Optional[int] = None) -> List[DetectionBox]:
        """Detect persons/poses in a BGR frame and return list of DetectionBox.

        `timestamp_ms` is optional and required only for detectors running in VIDEO mode.
        """
        raise NotImplementedError
