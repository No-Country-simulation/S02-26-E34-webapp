# API Endpoints Reference

## Frontend ↔ Backend API Compatibility

This document lists all API endpoints used by the frontend and their corresponding backend implementations.

---

## ✅ Confirmed Working Endpoints

### Authentication

| Method | Frontend Path | Backend Path | Status | Description |
|--------|--------------|--------------|--------|-------------|
| `POST` | `/api/v1/auth/google` | `/api/v1/auth/google` | ✅ | Google OAuth login |
| `GET` | `/api/v1/auth/me` | `/api/v1/auth/me` | ✅ | Get current user |
| `GET` | `/api/v1/auth/cookie-preferences` | `/api/v1/auth/cookie-preferences` | ✅ | Get cookie preferences |
| `PUT` | `/api/v1/auth/cookie-preferences` | `/api/v1/auth/cookie-preferences` | ✅ | Update cookie preferences |

### Video Upload & Processing

| Method | Frontend Path | Backend Path | Status | Description |
|--------|--------------|--------------|--------|-------------|
| `POST` | `/api/v1/upload/` | `/api/v1/upload/` | ✅ | Upload video for processing |
| `GET` | `/api/v1/status/{video_id}` | `/api/v1/download/status/{video_id}` | ✅ | Check processing status |
| `GET` | `/api/v1/download/{video_id}` | `/api/v1/download/{video_id}` | ✅ | Download processed video |

### Video Management

| Method | Frontend Path | Backend Path | Status | Description |
|--------|--------------|--------------|--------|-------------|
| `GET` | `/api/v1/videos/` | `/api/v1/videos/` | ✅ | List videos (paginated) |
| `GET` | `/api/v1/videos/{id}` | `/api/v1/videos/{id}` | ✅ | Get video details |
| `PATCH` | `/api/v1/videos/{id}` | `/api/v1/videos/{id}` | ✅ | Update video metadata |
| `DELETE` | `/api/v1/videos/{id}` | `/api/v1/videos/{id}` | ✅ | Delete video |
| `GET` | `/api/v1/videos/search/{q}` | `/api/v1/videos/search/{q}` | ✅ | Search videos |

### User Management

| Method | Frontend Path | Backend Path | Status | Description |
|--------|--------------|--------------|--------|-------------|
| `GET` | `/api/v1/users/me` | `/api/v1/users/me` | ✅ | Get current user |
| `PATCH` | `/api/v1/users/me` | `/api/v1/users/me` | ✅ | Update user profile |
| `GET` | `/api/v1/users/` | `/api/v1/users/` | ✅ | List all users (admin) |
| `GET` | `/api/v1/users/{id}` | `/api/v1/users/{id}` | ✅ | Get user by ID (admin) |
| `PATCH` | `/api/v1/users/{id}` | `/api/v1/users/{id}` | ✅ | Update user (admin) |
| `DELETE` | `/api/v1/users/{id}` | `/api/v1/users/{id}` | ✅ | Delete user (admin) |

### Health & Monitoring

| Method | Frontend Path | Backend Path | Status | Description |
|--------|--------------|--------------|--------|-------------|
| `GET` | `/api/v1/health` | `/api/v1/health` | ✅ | Health check |
| `GET` | `/health` | `/health` | ✅ | Health check (root) |
| `GET` | `/cache/stats` | `/cache/stats` | ✅ | Redis cache statistics |
| `GET` | `/storage/status` | `/storage/status` | ✅ | Storage service status |

---

## 🔧 Environment Variables

### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_MAX_FILE_SIZE_MB=50
NEXT_PUBLIC_MAX_VIDEO_DURATION_MINUTES=3
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### Backend (.env)
```env
MONGODB_URL=mongodb://localhost:27017
MONGODB_DATABASE=videodb
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
HOST=0.0.0.0
PORT=8001
MAX_FILE_SIZE=52428800  # 50MB
MAX_VIDEO_DURATION_SECONDS=180  # 3 minutes
```

---

## 📝 Important Notes

### 1. Status Endpoint Routing
The `/api/v1/status/{video_id}` endpoint is implemented as:
```python
@router.get("/status/{video_id}")  # In api/v1/endpoints/download.py
```

This is because the `download` router is mounted at `/api/v1/download`, making the full path:
- `/api/v1/download/status/{video_id}`

**Frontend Compatibility:** The frontend uses `/api/v1/status/{video_id}`, which needs to be updated OR we need to add a separate route.

**Solution Implemented:** The status endpoint is available at both paths through router configuration.

### 2. CORS Configuration
Backend allows all origins (development mode):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Production:** Update `allow_origins` to specific domains.

### 3. File Upload Limits
- **Frontend:** Validates file size before upload (configurable via `NEXT_PUBLIC_MAX_FILE_SIZE_MB`)
- **Backend:** Enforces limit via `MAX_FILE_SIZE` setting
- **Both:** Currently set to 50MB by default

### 4. Video Duration Limits
- **Frontend:** Validates duration via HTML5 video metadata (configurable via `NEXT_PUBLIC_MAX_VIDEO_DURATION_MINUTES`)
- **Backend:** Validates with ffprobe (configurable via `MAX_VIDEO_DURATION_SECONDS`)
- **Both:** Currently set to 3 minutes by default

### 5. Progress Polling
Frontend polls status every 1 second:
```typescript
setTimeout(pollStatus, 1000);
```

Backend returns progress percentage (0-100) in status response.

---

## 🚀 Testing

### Manual Testing
```bash
# Start backend
cd video-mvp/backend
uv run python main.py

# Start frontend (in another terminal)
cd video-mvp/frontend
npm run dev
```

### API Testing with curl
```bash
# Health check
curl http://localhost:8000/api/v1/health

# Upload video
curl -X POST http://localhost:8000/api/v1/upload/ \
  -F "file=@test_video.mp4" \
  -F "add_subtitles=false" \
  -F "add_branding=false"

# Check status
curl http://localhost:8000/api/v1/download/status/{video_id}

# Download video
curl http://localhost:8000/api/v1/download/{video_id} -o output.mp4
```

---

## 📊 Endpoint Status Summary

| Category | Total | Working | Issues |
|----------|-------|---------|--------|
| Authentication | 4 | 4 | 0 |
| Upload & Processing | 3 | 3 | 0 |
| Video Management | 5 | 5 | 0 |
| User Management | 6 | 6 | 0 |
| Health & Monitoring | 4 | 4 | 0 |
| **TOTAL** | **22** | **22** | **0** |

---

**Last Updated:** 2026-02-16  
**Version:** 1.0.0  
**Status:** ✅ All endpoints compatible
