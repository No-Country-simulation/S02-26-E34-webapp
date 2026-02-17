# backend/tests/conftest.py
"""
Pytest configuration and fixtures.

Provides:
- Test database setup/teardown
- Test client
- Authentication fixtures
- Mock data factories
"""
import asyncio
import os
import pytest
from typing import AsyncGenerator, Generator
from httpx import AsyncClient, ASGITransport
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

from main import app
from config.settings import settings
from models.database import database


# ==================== Test Settings ====================

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "mongodb://localhost:27017"
)
TEST_DATABASE_NAME = os.getenv(
    "TEST_DATABASE_NAME",
    "videodb_test"
)


# ==================== Event Loop ====================

@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# ==================== Database Fixtures ====================

@pytest.fixture(scope="function")
async def test_db() -> AsyncGenerator[AsyncIOMotorClient, None]:
    """
    Create test database connection.
    
    Cleans up before and after each test.
    """
    client = AsyncIOMotorClient(TEST_DATABASE_URL)
    db = client[TEST_DATABASE_NAME]
    
    # Clean before test
    await drop_all_collections(db)
    
    yield db
    
    # Clean after test
    await drop_all_collections(db)
    client.close()


async def drop_all_collections(db) -> None:
    """Drop all collections in database."""
    collections = await db.list_collection_names()
    for collection in collections:
        await db[collection].drop()


# ==================== App Fixtures ====================

@pytest.fixture(scope="function")
async def client(test_db: AsyncIOMotorClient) -> AsyncGenerator[AsyncClient, None]:
    """
    Create test HTTP client.
    
    Overrides database dependency with test database.
    """
    # Override database dependency
    async def override_get_db():
        yield test_db
    
    from api.dependencies import get_database
    app.dependency_overrides[get_database] = override_get_db
    
    # Create test client
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
    
    # Remove overrides
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
async def authenticated_client(
    test_db: AsyncIOMotorClient
) -> AsyncGenerator[AsyncClient, None]:
    """
    Create authenticated test HTTP client.
    
    Includes valid JWT token in requests.
    """
    from api.dependencies import get_database
    from services.user_service import UserService
    
    # Create test user
    user_service = UserService(test_db)
    user_data = {
        "google_id": "test_google_id",
        "email": "test@example.com",
        "name": "Test User",
        "verification_status": "verified"
    }
    user_id = await user_service.create_user(user_data)
    
    # Create JWT token
    from services.google_auth import GoogleAuthService
    token = GoogleAuthService.create_access_token(
        data={"sub": str(user_id), "email": user_data["email"]}
    )
    
    # Override database dependency
    async def override_get_db():
        yield test_db
    
    app.dependency_overrides[get_database] = override_get_db
    
    # Create test client with auth header
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"}
    ) as ac:
        yield ac
    
    app.dependency_overrides.clear()


# ==================== Data Factories ====================

@pytest.fixture
def video_factory() -> callable:
    """
    Factory for creating test video data.
    
    Usage:
        video_data = video_factory(status="processed")
    """
    def create_video(**kwargs) -> dict:
        video = {
            "_id": ObjectId(),
            "original_filename": kwargs.get("original_filename", "test.mp4"),
            "title": kwargs.get("title", "Test Video"),
            "original_file_path": kwargs.get("original_file_path", "/tmp/test.mp4"),
            "file_size_bytes": kwargs.get("file_size_bytes", 1024 * 1024),
            "duration_seconds": kwargs.get("duration_seconds", 60.0),
            "status": kwargs.get("status", "uploaded"),
            "progress": kwargs.get("progress", 0),
            "add_subtitles": kwargs.get("add_subtitles", False),
            "add_branding": kwargs.get("add_branding", False),
            "created_at": kwargs.get("created_at"),
            "updated_at": kwargs.get("updated_at")
        }
        
        if kwargs.get("user_id"):
            video["user_id"] = kwargs["user_id"]
        
        return video
    
    return create_video


@pytest.fixture
def user_factory() -> callable:
    """
    Factory for creating test user data.
    
    Usage:
        user_data = user_factory(role="admin")
    """
    def create_user(**kwargs) -> dict:
        user = {
            "_id": ObjectId(),
            "google_id": kwargs.get("google_id", "test_google_id"),
            "email": kwargs.get("email", "test@example.com"),
            "name": kwargs.get("name", "Test User"),
            "picture": kwargs.get("picture"),
            "role": kwargs.get("role", "user"),
            "verification_status": kwargs.get(
                "verification_status",
                "verified"
            ),
            "created_at": kwargs.get("created_at"),
            "updated_at": kwargs.get("updated_at")
        }
        
        return user
    
    return create_user


# ==================== Utility Fixtures ====================

@pytest.fixture
def test_file(tmp_path) -> str:
    """
    Create a test file.
    
    Returns path to temporary test file.
    """
    file_path = tmp_path / "test.txt"
    file_path.write_text("test content")
    return str(file_path)


@pytest.fixture
def mock_video_file(tmp_path) -> str:
    """
    Create a mock video file.
    
    Returns path to temporary video file.
    """
    file_path = tmp_path / "test.mp4"
    # Create minimal valid MP4 file (ftyp box)
    file_path.write_bytes(
        b'\x00\x00\x00\x18ftypisom\x00\x00\x00\x00isom'
    )
    return str(file_path)


# ==================== Cleanup ====================

@pytest.fixture(autouse=True)
def cleanup():
    """
    Automatic cleanup after each test.
    
    Ensures no state leaks between tests.
    """
    yield
    # Cleanup happens in test_db fixture
