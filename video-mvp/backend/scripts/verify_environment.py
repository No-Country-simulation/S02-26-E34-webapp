import importlib
import shutil
import sys


def _check_module(module_name: str):
    try:
        importlib.import_module(module_name)
        return True, None
    except Exception as exc:
        return False, str(exc)


def main() -> int:
    python_ok = sys.version_info >= (3, 11)
    checks = [
        "fastapi",
        "pydantic",
        "cv2",
        "google.genai",
        "bcrypt",
        "whisper",
        "mediapipe",
    ]

    failed = False

    print("== Python runtime ==")
    runtime_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    print(f"[INFO] Python {runtime_version}")
    if not python_ok:
        print("[WARN] Se recomienda Python 3.11+ para compatibilidad futura con Gemini/Google.")

    print("== Python package checks ==")
    for module_name in checks:
        ok, error = _check_module(module_name)
        if ok:
            print(f"[OK] {module_name}")
        else:
            failed = True
            print(f"[FAIL] {module_name}: {error}")

    print("\n== Runtime checks ==")
    try:
        import cv2

        if hasattr(cv2, "VideoCapture"):
            print("[OK] cv2.VideoCapture disponible")
        else:
            failed = True
            print("[FAIL] cv2.VideoCapture no disponible")
    except Exception as exc:
        failed = True
        print(f"[FAIL] cv2 runtime: {exc}")

    for binary in ("ffmpeg", "ffprobe"):
        if shutil.which(binary):
            print(f"[OK] {binary} en PATH")
        else:
            failed = True
            print(f"[FAIL] {binary} no encontrado en PATH")

    if failed:
        print("\nEnvironment validation: FAILED")
        return 1

    print("\nEnvironment validation: PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
