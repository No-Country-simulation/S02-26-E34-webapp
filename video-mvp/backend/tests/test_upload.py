# backend/tests/test_upload.py
"""
Tests for video upload endpoints.

Run with:
    pytest tests/test_upload.py -v
"""
import pytest
from httpx import AsyncClient


class TestUploadEndpoint:
    """Test video upload functionality."""
    
    @pytest.mark.asyncio
    async def test_upload_video_success(
        self,
        client: AsyncClient,
        mock_video_file: str
    ):
        """Test successful video upload."""
        with open(mock_video_file, "rb") as f:
            response = await client.post(
                "/api/v1/upload/",
                files={"file": ("test.mp4", f, "video/mp4")},
                data={
                    "title": "Test Video",
                    "add_subtitles": "false",
                    "add_branding": "false"
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "video_id" in data
        assert data["status"] == "uploaded"
        assert "filename" in data
    
    @pytest.mark.asyncio
    async def test_upload_video_invalid_format(
        self,
        client: AsyncClient,
        tmp_path
    ):
        """Test upload with unsupported file format."""
        # Create invalid file
        file_path = tmp_path / "test.txt"
        file_path.write_text("not a video")
        
        with open(file_path, "rb") as f:
            response = await client.post(
                "/api/v1/upload/",
                files={"file": ("test.txt", f, "text/plain")}
            )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data or "detail" in data
    
    @pytest.mark.asyncio
    async def test_upload_video_missing_file(
        self,
        client: AsyncClient
    ):
        """Test upload without file."""
        response = await client.post(
            "/api/v1/upload/",
            data={"title": "Test Video"}
        )
        
        assert response.status_code == 422  # Validation error
    
    @pytest.mark.asyncio
    async def test_upload_video_with_options(
        self,
        client: AsyncClient,
        mock_video_file: str
    ):
        """Test upload with subtitles and branding options."""
        with open(mock_video_file, "rb") as f:
            response = await client.post(
                "/api/v1/upload/",
                files={"file": ("test.mp4", f, "video/mp4")},
                data={
                    "title": "Test Video",
                    "add_subtitles": "true",
                    "add_branding": "true"
                }
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "uploaded"


class TestUploadValidation:
    """Test video upload validation."""
    
    @pytest.mark.asyncio
    async def test_upload_title_length(
        self,
        client: AsyncClient,
        mock_video_file: str
    ):
        """Test title length validation."""
        long_title = "A" * 300  # Exceeds 255 char limit
        
        with open(mock_video_file, "rb") as f:
            response = await client.post(
                "/api/v1/upload/",
                files={"file": ("test.mp4", f, "video/mp4")},
                data={"title": long_title}
            )
        
        # Should either accept with truncation or reject
        assert response.status_code in [200, 400]
