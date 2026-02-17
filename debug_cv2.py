import cv2
print(cv2.__version__)
try:
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    if face_cascade.empty():
        print("Cascade empty")
    else:
        print("Cascade loaded")
except Exception as e:
    print(e)
