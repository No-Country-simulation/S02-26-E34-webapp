import asyncio
from fastapi import FastAPI, Path
from pydantic import BaseModel, Field

# Mock imports from your existing Core Engine
from app.core.dtos import SelectionRect, AnalysisRequest, VideoMetadata

app = FastAPI(title="Subject Selection API Mock")

# --- 1. Define Frontend Input Schemas ---

class SelectionRectPayload(BaseModel):
    cx: float = Field(..., description="Center X (normalized 0.0 to 1.0)")
    cy: float = Field(..., description="Center Y (normalized 0.0 to 1.0)")
    w: float = Field(..., description="Width (normalized 0.0 to 1.0)")
    h: float = Field(..., description="Height (normalized 0.0 to 1.0)")

class AnalyzeVideoRequest(BaseModel):
    timestamp_sec: float = Field(..., description="Timestamp in seconds where the user made the selection")
    selection_rect: SelectionRectPayload

# --- 2. API Endpoint ---

@app.post("/api/v1/videos/{video_id}/analyze")
async def trigger_video_analysis(
    payload: AnalyzeVideoRequest,
    video_id: str = Path(..., description="The ID of the video in the database")
):
    """
    Endpoint called by the Frontend when the user confirms their 9:16 subject selection.
    """
    print(f"--- Received Analysis Request for Video {video_id} ---")
    print(f"User selected timestamp: {payload.timestamp_sec} seconds")
    print(f"Selection Box: Center({payload.selection_rect.cx}, {payload.selection_rect.cy}) | Size({payload.selection_rect.w}x{payload.selection_rect.h})")

    # 1. Fetch Video Metadata from Database (Mocked here)
    # db_video = await video_repo.get_by_id(video_id)
    video_meta = VideoMetadata(
        width=1920,
        height=1080,
        fps=30.0,
        duration=15.0
    )

    # 2. Map Frontend Payload to Backend DTOs
    selection_dto = SelectionRect(
        cx=payload.selection_rect.cx,
        cy=payload.selection_rect.cy,
        w=payload.selection_rect.w,
        h=payload.selection_rect.h
    )

    analysis_req = AnalysisRequest(
        video_id=video_id,
        video_metadata=video_meta,
        timestamp_sec=payload.timestamp_sec,
        selection_rect=selection_dto,
        options={"smoothing_alpha": 0.15, "expand_factor": 1.2}
    )

    # 3. Trigger Background Task to run CoreEngine (Mocked here)
    # asyncio.create_task(run_core_engine_background(analysis_req))
    print("
✅ Successfully built AnalysisRequest. Ready to pass to CoreEngine.analyze()")

    return {
        "status": "processing",
        "job_id": f"job_{video_id}_abc123",
        "message": "Subject tracking queued."
    }

# Run this file directly to test the mock endpoint locally
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
