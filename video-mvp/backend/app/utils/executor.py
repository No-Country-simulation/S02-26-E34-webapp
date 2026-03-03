# backend/utils/executor.py
"""
Process pool executor for CPU-bound tasks.

Features:
- Process pool for parallel CPU-bound operations
- Async wrapper for synchronous functions
- Task cancellation support
- Performance monitoring

Use Cases:
- Video processing (FFmpeg)
- Image processing (OpenCV)
- AI inference (YOLO, Whisper)
- Heavy computations

Performance:
- Non-blocking async operations
- Parallel execution across CPU cores
- Prevents event loop starvation
"""
import asyncio
import logging
import os
from concurrent.futures import ProcessPoolExecutor, Executor, Future
from typing import Any, Callable, Optional, TypeVar
from functools import wraps

logger = logging.getLogger(__name__)

# Type variable for generic return types
T = TypeVar('T')


class TaskExecutor:
    """
    Process pool executor for CPU-bound tasks.
    
    Usage:
        executor = TaskExecutor(max_workers=4)
        result = await executor.run(cpu_bound_function, arg1, arg2)
        executor.shutdown()
    """
    
    def __init__(self, max_workers: Optional[int] = None):
        """
        Initialize process pool executor.
        
        Args:
            max_workers: Maximum number of worker processes (default: CPU count)
        """
        if max_workers is None:
            max_workers = os.cpu_count() or 4
        
        self.max_workers = max_workers
        self._executor: Optional[Executor] = None
        self._running = False
    
    def start(self) -> None:
        """Start the process pool."""
        if self._running:
            logger.warning("Executor already running")
            return
        
        self._executor = ProcessPoolExecutor(max_workers=self.max_workers)
        self._running = True
        logger.info(f"✓ Process pool started (max_workers={self.max_workers})")
    
    def shutdown(self, wait: bool = False) -> None:
        """
        Shutdown the process pool.
        
        Args:
            wait: Wait for pending tasks to complete
        """
        if not self._running:
            return
        
        if self._executor:
            self._executor.shutdown(wait=wait)
            self._executor = None
        
        self._running = False
        logger.info("✓ Process pool shutdown complete")
    
    async def run(
        self,
        func: Callable[..., T],
        *args,
        **kwargs
    ) -> T:
        """
        Run CPU-bound function in process pool (async).
        
        Args:
            func: Function to run
            *args: Positional arguments
            **kwargs: Keyword arguments
        
        Returns:
            Function result
        
        Raises:
            RuntimeError: If executor not started
        """
        if not self._running or not self._executor:
            raise RuntimeError("Executor not started. Call start() first.")
        
        loop = asyncio.get_event_loop()
        
        # Wrap function with kwargs support
        def wrapped_func():
            return func(*args, **kwargs)
        
        return await loop.run_in_executor(
            self._executor,
            wrapped_func
        )
    
    async def run_with_timeout(
        self,
        func: Callable[..., T],
        timeout: float,
        *args,
        **kwargs
    ) -> T:
        """
        Run CPU-bound function with timeout.
        
        Args:
            func: Function to run
            timeout: Timeout in seconds
            *args: Positional arguments
            **kwargs: Keyword arguments
        
        Returns:
            Function result
        
        Raises:
            asyncio.TimeoutError: If timeout exceeded
        """
        try:
            return await asyncio.wait_for(
                self.run(func, *args, **kwargs),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            logger.error(f"Task timeout: {func.__name__} ({timeout}s)")
            raise
    
    @property
    def is_running(self) -> bool:
        """Check if executor is running."""
        return self._running
    
    # Context manager support
    
    def __enter__(self):
        """Context manager entry."""
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.shutdown(wait=True)


# ==================== Async Decorator ====================

def run_in_executor(executor: Optional[Executor] = None):
    """
    Decorator to run async function in executor.
    
    Usage:
        @run_in_executor()
        def cpu_bound_function(data):
            # Heavy computation
            return result
        
        # Or with custom executor:
        @run_in_executor(custom_executor)
        def another_function(data):
            return result
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            loop = asyncio.get_event_loop()
            
            def wrapped():
                return func(*args, **kwargs)
            
            if executor:
                return await loop.run_in_executor(executor, wrapped)
            else:
                return await loop.run_in_executor(None, wrapped)
        
        return wrapper
    return decorator


# ==================== Global Executor ====================

# Global process pool for video processing
_video_processor_executor: Optional[TaskExecutor] = None


def get_video_processor_executor(max_workers: int = 4) -> TaskExecutor:
    """
    Get or create global video processor executor.
    
    Args:
        max_workers: Maximum worker processes
    
    Returns:
        TaskExecutor instance
    """
    global _video_processor_executor
    
    if _video_processor_executor is None:
        _video_processor_executor = TaskExecutor(max_workers=max_workers)
        _video_processor_executor.start()
    
    return _video_processor_executor


def shutdown_video_processor_executor() -> None:
    """Shutdown global video processor executor."""
    global _video_processor_executor
    
    if _video_processor_executor:
        _video_processor_executor.shutdown(wait=False)
        _video_processor_executor = None


# ==================== Video Processing Helpers ====================

async def run_video_processing_task(
    func: Callable[..., T],
    *args,
    **kwargs
) -> T:
    """
    Run video processing task in dedicated process pool.
    
    Usage:
        result = await run_video_processing_task(
            convert_to_vertical,
            input_path,
            video_id
        )
    
    Args:
        func: Processing function
        *args: Function arguments
        **kwargs: Function keyword arguments
    
    Returns:
        Processing result
    """
    executor = get_video_processor_executor()
    return await executor.run(func, *args, **kwargs)


# ==================== Example Usage ====================

if __name__ == "__main__":
    # Example CPU-bound function
    def heavy_computation(n: int) -> int:
        """Example heavy computation."""
        result = 0
        for i in range(n):
            result += i * i
        return result
    
    async def main():
        # Using TaskExecutor
        executor = TaskExecutor(max_workers=4)
        executor.start()
        
        result = await executor.run(heavy_computation, 10_000_000)
        print(f"Result: {result}")
        
        executor.shutdown(wait=True)
        
        # Using decorator
        @run_in_executor()
        def another_heavy_task(data: list) -> list:
            return [x * x for x in data]
        
        result = await another_heavy_task(list(range(1000)))
        print(f"Decorator result length: {len(result)}")
    
    asyncio.run(main())
