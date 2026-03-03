from app.main import app

__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn
    from app.core.config import settings

    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        log_level="info",
    )
