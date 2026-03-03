import cv2
import json
import argparse
import sys
import os

def visualize(video_path, json_path, out_path, sel_cx=None, sel_cy=None, sel_w=None, sel_h=None, sel_time=None):
    if not os.path.exists(video_path):
        print(f"Error: Video file not found: {video_path}")
        sys.exit(1)
    if not os.path.exists(json_path):
        print(f"Error: JSON file not found: {json_path}")
        sys.exit(1)

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # create a dictionary of frame_index -> crop data
    crops = { c['frame_index']: c for c in data.get('crop_results', []) }
    if not crops:
        print("Warning: No crop results found in the JSON file.")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video {video_path}")
        sys.exit(1)

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(out_path, fourcc, fps, (width, height))

    print(f"Visualizing {len(crops)} frames onto {out_path}...")

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        timestamp = frame_idx / fps

        # Draw the user's initial selection rectangle if we are within 1 second of the target time
        if sel_time is not None and sel_cx is not None and sel_cy is not None and sel_w is not None:
            if sel_time <= timestamp <= sel_time + 1.5:
                # Calculate pixel coords for user selection
                s_h = sel_h if sel_h is not None else min(1.0, sel_w * (16.0 / 9.0))
                sw_px = int(sel_w * width)
                sh_px = int(s_h * height)
                x1 = int(sel_cx * width - sw_px / 2)
                y1 = int(sel_cy * height - sh_px / 2)
                x2 = x1 + sw_px
                y2 = y1 + sh_px
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)  # RED for user selection
                cv2.putText(frame, "User Selection", (x1, max(10, y1 - 10)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)


        crop_data = crops.get(frame_idx)
        if crop_data and crop_data.get('subject_detected', False):
            # Draw 9:16 smoothed crop window (Green)
            cw = crop_data.get('crop_window')
            if cw and len(cw) == 4:
                cx1, cy1, cx2, cy2 = int(cw[0]), int(cw[1]), int(cw[2]), int(cw[3])
                cv2.rectangle(frame, (cx1, cy1), (cx2, cy2), (0, 255, 0), 3)
                cv2.putText(frame, "9:16 Crop", (cx1, max(10, cy1 - 10)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

        out.write(frame)
        frame_idx += 1

    cap.release()
    out.release()
    print("Done!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Visualize crop windows on a video")
    parser.add_argument("--video", required=True, help="Path to original video")
    parser.add_argument("--json", default="analysis_output.json", help="Path to JSON output")
    parser.add_argument("--out", default="debug_output.mp4", help="Path to save output video")
    
    # Add selection args to visualize what the user actually asked for
    parser.add_argument("--sel-cx", type=float, default=None, help="Selection Center X")
    parser.add_argument("--sel-cy", type=float, default=None, help="Selection Center Y")
    parser.add_argument("--sel-w", type=float, default=None, help="Selection Width")
    parser.add_argument("--sel-h", type=float, default=None, help="Selection Height")
    parser.add_argument("--sel-time", type=float, default=None, help="Timestamp selection")
    
    args = parser.parse_args()
    visualize(args.video, args.json, args.out, args.sel_cx, args.sel_cy, args.sel_w, args.sel_h, args.sel_time)
