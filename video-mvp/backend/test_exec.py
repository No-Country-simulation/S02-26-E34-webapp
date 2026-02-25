#!/usr/bin/env python3
"""Local test runner for CoreEngine pipeline.

This script can run against a real video (if OpenCV is available) or a
synthetic generated sequence. It exercises Detector->Stabilizer->Calculator
and writes a JSON summary to disk.
"""
from __future__ import annotations
import os
import sys
import argparse
import json
import time
from dataclasses import asdict
from typing import Iterable, Tuple

import numpy as np
try:
	import cv2
except Exception:
	cv2 = None

# Ensure local package imports work when running this script from backend/
HERE = os.path.dirname(__file__)
if HERE not in sys.path:
	sys.path.insert(0, HERE)

from core import (
	MediaPipeDetector,
	Stabilizer,
	CoreEngine,
	HybridTrackerEngine,
	VideoMetadata,
	SelectionRect,
	AnalysisRequest,
	DetectionBox,
)


class FakeDetector:
	"""Simple deterministic detector used for local tests when MediaPipe
	is not available. Returns a moving box across frames."""

	def __init__(self, video_width: int, video_height: int):
		self.w = video_width
		self.h = video_height

	def detect(self, frame: np.ndarray, timestamp_ms: int = None):
		# compute a box based on time / hash of frame
		# frame is array; use mean to generate movement
		m = float(frame.mean() if frame is not None else 0.0)
		cx = int(self.w * (0.3 + 0.4 * ((m % 100) / 100.0)))
		cy = int(self.h * 0.5)
		bw = int(self.w * 0.15)
		bh = int(self.h * 0.3)
		x1 = max(0, cx - bw // 2)
		y1 = max(0, cy - bh // 2)
		x2 = min(self.w, x1 + bw)
		y2 = min(self.h, y1 + bh)
		# also return a static centered box to simulate a subject inside selection area
		cx2 = int(self.w * 0.5)
		cy2 = int(self.h * 0.5)
		bw2 = int(self.w * 0.12)
		bh2 = int(self.h * 0.25)
		x1c = max(0, cx2 - bw2 // 2)
		y1c = max(0, cy2 - bh2 // 2)
		x2c = min(self.w, x1c + bw2)
		y2c = min(self.h, y1c + bh2)
		return [
			DetectionBox(x1=x1, y1=y1, x2=x2, y2=y2, confidence=0.6),
			DetectionBox(x1=x1c, y1=y1c, x2=x2c, y2=y2c, confidence=0.95),
		]


def frames_from_video(path: str) -> Iterable[Tuple[int, float, np.ndarray]]:
	cap = cv2.VideoCapture(path)
	if not cap.isOpened():
		raise RuntimeError(f"Cannot open video {path}")
	fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
	idx = 0
	while True:
		ret, frame = cap.read()
		if not ret:
			break
		ts = idx / fps
		yield idx, ts, frame
		idx += 1


def frames_synthetic(num_frames: int, width: int, height: int) -> Iterable[Tuple[int, float, np.ndarray]]:
	fps = 30.0
	for i in range(num_frames):
		frame = np.zeros((height, width, 3), dtype=np.uint8)
		# draw a moving bright area so FakeDetector has varying mean
		cx = int(width * (0.2 + 0.6 * (i / max(1, num_frames - 1))))
		cy = height // 2
		cv2 = None
		try:
			import cv2 as _cv2
			cv2 = _cv2
		except Exception:
			cv2 = None
		if cv2:
			cv2.circle(frame, (cx, cy), min(width, height) // 8, (200, 200, 200), -1)
		else:
			# fallback simple gradient
			frame[:] = int(50 + 200 * (i / max(1, num_frames - 1)))
		ts = i / fps
		yield i, ts, frame


def run_test(args):
	if args.video and cv2:
		# attempt real video
		cap = cv2.VideoCapture(args.video)
		if not cap.isOpened():
			print(f"Failed to open video {args.video}, falling back to synthetic frames.")
			use_video = False
		else:
			use_video = True
			width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
			height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
			fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
			cap.release()
	else:
		use_video = False

	if use_video:
		video_meta = VideoMetadata(width=width, height=height, fps=fps, duration=None)
		frames_iter = frames_from_video(args.video)
	else:
		width, height = (1280, 720)
		fps = 30.0
		video_meta = VideoMetadata(width=width, height=height, fps=fps, duration=(args.frames / fps))
		frames_iter = frames_synthetic(args.frames, width, height)

	# build AnalysisRequest with CLI arguments
	sel_cx = args.sel_cx
	sel_cy = args.sel_cy
	sel_w = args.sel_w
	# If height isn't provided, calculate it to maintain 9:16 aspect ratio
	sel_h = args.sel_h if args.sel_h is not None else min(1.0, sel_w * (16.0 / 9.0))
	
	selection = SelectionRect(cx=sel_cx, cy=sel_cy, w=sel_w, h=sel_h)
	request = AnalysisRequest(
		video_id=(args.video or "synthetic"), 
		video_metadata=video_meta, 
		timestamp_sec=args.sel_time, 
		selection_rect=selection, 
		options={}
	)

	# choose detector: prefer MediaPipe if available, else FakeDetector
	detector = None
	try:
		# Try to instantiate MediaPipeDetector (Tasks API)
		# It will auto-download model if not present
		print("Initializing MediaPipeDetector...")
		mpd = MediaPipeDetector()
		if getattr(mpd, "_landmarker", None) is not None:
			detector = mpd
			print("Using MediaPipeDetector for detection.")
		else:
			raise Exception("_landmarker not initialized")
	except Exception as e:
		print(f"MediaPipeDetector failed: {e}. Falling back to FakeDetector.")
		detector = FakeDetector(video_meta.width, video_meta.height)
		print("Using FakeDetector for detection.")

	stabilizer = Stabilizer(alpha=args.alpha)
	engine = HybridTrackerEngine(stabilizer=stabilizer, options={"smoothing_alpha": args.alpha, "expand_factor": args.expand})

	t0 = time.time()
	resp = engine.analyze(frames_iter, request)
	dt = time.time() - t0

	out = {
		"subject_id": resp.subject_id,
		"original_video": asdict(resp.original_video),
		"crop_results": [c.to_dict() for c in resp.crop_results],
		"meta": resp.meta,
		"timing_seconds": dt,
	}

	with open(args.out, "w", encoding="utf-8") as f:
		json.dump(out, f, indent=2)

	print(f"Wrote analysis to {args.out}. Frames processed: {len(resp.crop_results)}. Time: {dt:.3f}s")


def build_parser():
	p = argparse.ArgumentParser(description="Run local CoreEngine test")
	p.add_argument("--video", type=str, help="Path to input video (optional)")
	p.add_argument("--frames", type=int, default=60, help="Number of synthetic frames if no video")
	p.add_argument("--out", type=str, default="analysis_output.json", help="Output JSON file")
	p.add_argument("--alpha", type=float, default=0.15, help="Stabilizer alpha")
	p.add_argument("--expand", type=float, default=1.2, help="Expand factor for crop window")
	
	# Mock Frontend Selection Arguments
	p.add_argument("--sel-cx", type=float, default=0.5, help="Selection Center X (0.0 to 1.0)")
	p.add_argument("--sel-cy", type=float, default=0.5, help="Selection Center Y (0.0 to 1.0)")
	p.add_argument("--sel-w", type=float, default=0.4, help="Selection Width (0.0 to 1.0)")
	p.add_argument("--sel-h", type=float, default=None, help="Selection Height (0.0 to 1.0). Will auto-calc 9:16 if omitted.")
	p.add_argument("--sel-time", type=float, default=0.0, help="Timestamp in seconds where selection was made")
	
	return p


if __name__ == "__main__":
	parser = build_parser()
	args = parser.parse_args()
	run_test(args)
