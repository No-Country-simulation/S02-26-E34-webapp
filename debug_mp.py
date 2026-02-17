import mediapipe as mp
try:
    import mediapipe.python.solutions
    print("Found mediapipe.python.solutions")
except ImportError as e:
    print(f"Could not import mediapipe.python.solutions: {e}")

try:
    from mediapipe import solutions
    print("Found from mediapipe import solutions")
except ImportError as e:
    print(f"Could not form mediapipe import solutions: {e}")