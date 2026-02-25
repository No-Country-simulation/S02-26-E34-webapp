# Subject Selection API (Frontend to Backend)

This document describes how the Frontend should send the user's manual 9:16 subject selection to the Backend API.

## Goal
The user views a specific frame of their uploaded video on the Frontend. They drag and resize a 9:16 selection box over the person they want to track. The Frontend sends the coordinates of this box to the Backend, which then runs the `CoreEngine` to track that person throughout the video.

## API Endpoint (Mockup)
**POST** `/api/v1/videos/{video_id}/analyze`

### Request Payload (JSON)

The payload requires normalized coordinates (values from `0.0` to `1.0`). This ensures that the selection is resolution-independent, meaning it works correctly regardless of whether the frontend video player is scaled down or full screen.

```json
{
  "timestamp_sec": 1.5,
  "selection_rect": {
    "cx": 0.5,
    "cy": 0.5,
    "w": 0.4,
    "h": 0.711
  }
}
```

#### Field Explanations:
*   `timestamp_sec` *(float)*: The exact time in seconds where the user paused the video to make the selection. This corresponds to the `currentTime` property of the HTML5 `<video>` element.
*   `selection_rect` *(object)*: The 9:16 bounding box drawn by the user.
    *   `cx` *(float)*: Center X coordinate of the box (0.0 is left edge, 1.0 is right edge).
    *   `cy` *(float)*: Center Y coordinate of the box (0.0 is top edge, 1.0 is bottom edge).
    *   `w` *(float)*: Width of the box relative to the video width (0.0 to 1.0).
    *   `h` *(float)*: Height of the box relative to the video height.

> **Important Constraint for Frontend:**
> The `selection_rect` drawn by the user **MUST** have a 9:16 aspect ratio. Therefore, the formula `(w * video_width) / (h * video_height)` should equal `9/16`.

### Response Payload (JSON)

Returns a status indicating the background processing has started.

```json
{
  "status": "processing",
  "job_id": "job_987654321",
  "message": "Subject tracking started for video 12345"
}
```

## How the Backend uses this data (CoreEngine)
When the backend receives this payload, it constructs an `AnalysisRequest` internally. The tracking pipeline will automatically look for all human detections in the video and give priority to the person whose detection box overlaps the most (highest IoU) with the user's `selection_rect`.

See `mock_selection_api.py` for a working code example of how this is integrated.