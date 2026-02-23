import base64
import datetime
import io
import math
import os
import shutil
import sys
import threading

import cv2
import numpy as np
import rawpy
from PIL import Image
from scipy.spatial.distance import euclidean
from ultralytics import YOLO


# Helper functions
def adjust_dynamic_brightness(rgb_image, target_brightness=150):
    """
    Adjusts the brightness of an image dynamically to meet a target brightness level.

    :param rgb_image: The processed RGB image as a NumPy array.
    :param target_brightness: The target brightness level (0-255).
    :return: The brightness-adjusted image.
    """
    # Calculate the mean brightness of the image
    current_brightness = np.mean(rgb_image)
    brightness_factor = (
        target_brightness / current_brightness if current_brightness > 0 else 1
    )

    # Scale the brightness and clip values
    adjusted_image = np.clip(rgb_image * brightness_factor, 0, 255).astype(np.uint8)
    return adjusted_image


def slope(x1, y1, x2, y2):
    ###finding slope
    if x2 != x1:
        return (y2 - y1) / (x2 - x1)
    else:
        return "NA"


def findIntersection(x1, y1, x2, y2, x3, y3, x4, y4):
    px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / (
        (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    )
    py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / (
        (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    )
    return [px, py]


def drawLine(image, x1, y1, x2, y2, color=(0, 255, 0)):
    m = slope(x1, y1, x2, y2)
    h, w = image.shape[:2]
    if m != "NA":
        ### here we are essentially extending the line to x=0 and x=width
        ### and calculating the y associated with it
        ##starting point
        px = 0
        py = -(x1 - 0) * m + y1
        ##ending point
        qx = w
        qy = -(x2 - w) * m + y2
    else:
        ### if slope is zero, draw a line with x=x1 and y=0 and y=height
        px, py = x1, 0
        qx, qy = x1, h
    cv2.line(image, (int(px), int(py)), (int(qx), int(qy)), color, 3)


def getAngle(a, b, c):
    ang = math.degrees(
        math.atan2(c[1] - b[1], c[0] - b[0]) - math.atan2(a[1] - b[1], a[0] - b[0])
    )
    return (
        abs(ang) - 180 if abs(ang) > 180 else abs(ang)
    )  # ang + 360 if ang < 0 else ang


def get_resource_path(relative_path):
    """Gets the absolute path of a resource, whether in development or in the executable."""
    if hasattr(sys, "_MEIPASS"):
        # In the executable, resources are located in sys._MEIPASS
        base_path = sys._MEIPASS
    else:
        # In development, resources are in the current directory
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)


def process_green_lines(img, original_img=None):
    """Core logic for detecting green lines and cropping based on them."""
    height, width, channels = img.shape
    img_small = cv2.resize(img, (0, 0), fx=0.1, fy=0.1)

    hsv = cv2.cvtColor(img_small, cv2.COLOR_BGR2HSV)
    mask1 = cv2.inRange(hsv, (30, 25, 40), (140, 255, 255))

    kernel = np.ones((2, 2), np.uint8)
    mask1 = cv2.morphologyEx(mask1, cv2.MORPH_OPEN, kernel)

    edges = cv2.Canny(mask1, 50, 200, None, 3)
    linesP = cv2.HoughLinesP(
        edges,
        1,
        np.pi / 180,
        10,
        minLineLength=min(height, width) * 0.1 * 0.7,
        maxLineGap=200,
    )

    if linesP is None or len(linesP) < 2:
        print("No green strings detected.")
        return None, None

    # Sort lines by length
    distance_list = [
        euclidean((line[0][0], line[0][1]), (line[0][2], line[0][3])) for line in linesP
    ]
    ids = (-np.array(distance_list)).argsort()
    lines_sorted = [linesP[i][0] for i in ids]

    # Reference line
    x1, y1, x2, y2 = lines_sorted[0]

    for line in lines_sorted[1:]:
        start_point = (line[0], line[1])
        x_inter, y_inter = findIntersection(x1, y1, x2, y2, *line)
        if x_inter is not None:
            angle = getAngle(start_point, (x_inter, y_inter), (x1, y1))
            if 80 < angle < 95:
                mask = np.zeros(img_small.shape[:2], dtype="uint8")
                drawLine(mask, *line, 255)
                drawLine(mask, x1, y1, x2, y2, 255)
                print(f"Detected green strings. Detected angle: {angle}")
                mask = cv2.bitwise_not(mask)
                contours, _ = cv2.findContours(
                    mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE
                )

                mask = cv2.cvtColor(mask, cv2.COLOR_GRAY2RGB)
                final_mask = np.zeros(img_small.shape, dtype="uint8")
                cv2.drawContours(
                    final_mask,
                    [max(contours, key=cv2.contourArea)],
                    -1,
                    (255, 255, 255),
                    thickness=cv2.FILLED,
                )
                final_mask = cv2.resize(final_mask, (width, height))

                result = cv2.bitwise_and(original_img or img, final_mask)
                return result, final_mask

    print("No green strings detected.")
    return None, None


def process_dng(file_path):
    """Process a DNG file and return the RGB image."""
    try:
        with rawpy.imread(file_path) as raw:
            rgb_image = raw.postprocess(
                gamma=(2.0, 4.5),
                no_auto_bright=False,
                output_bps=16,
                use_camera_wb=True,
                user_sat=0.9,
                highlight_mode=1,
            )
        rgb_image = (rgb_image / 256).astype(np.uint8)
        rgb_image = adjust_dynamic_brightness(rgb_image, target_brightness=150)
        # Convert from RGB to BGR for OpenCV
        bgr_image = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR)
        return bgr_image
    except Exception as e:
        print(f"Error processing DNG file: {str(e)}")
        return None


def crop_green_lines(base64_str):
    """Detect green lines from file."""
    # If the base64 string includes a prefix like "data:image/png;base64,", remove it:
    if base64_str.startswith("data:image"):
        base64_str = base64_str.split(",")[1]

    # Decode the base64 string into bytes
    image_bytes = base64.b64decode(base64_str)

    # Convert bytes to a NumPy array
    nparr = np.frombuffer(image_bytes, np.uint8)

    # Decode the image (similar to cv2.imread)`
    initial_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if initial_img is None:
        raise ValueError("Could not read image")
    return process_green_lines(
        initial_img,
        original_img=initial_img,
    )


def crop_green_lines_from_array(img):
    """Detect green lines from numpy array image."""
    return process_green_lines(img)


class VarroaDetector:
    def __init__(self):
        # Add dictionary to store image-specific confidence thresholds
        self.image_confidence_thresholds = {}
        self.green_line_enabled = {}
        self.current_image = None
        self.current_boxes = {}  # Store boxes for each image
        self.boxes_green_lines = {}  # Store boxes for each image for green lines
        self.mite_count = 0  # Keep track of mites detected in image

        # Initialize model
        self.model_path = get_resource_path("model/weights/best.pt")
        self.model = YOLO(self.model_path, verbose=False)
        self.current_folder = None  # TODO: remove references to this once testing is done, nothing needs to be saved locally to PC
        self.output_path = None
        self.image_to_analyze = None

    def get_all_images(self, folder):
        """Recursively get all JPG and DNG files from folder and subfolders"""
        image_files = []
        for root, _, files in os.walk(folder):
            print(root, files)
            for f in files:
                print(f)
                if f.lower().endswith((".jpg", ".dng")):
                    # Get the full path and the relative path
                    full_path = os.path.join(root, f)
                    rel_path = os.path.relpath(full_path, folder)
                    return (full_path, rel_path)
        return image_files

    def select_folder_threaded(self, temperature, callback=None):
        def wrapper():
            result = self.select_folder()
            if callback:
                callback(result)

        thread = threading.Thread(target=wrapper)
        thread.start()

    def determine_treatment(self, date):
        honey_supers_on = True
        hive_broodless = True
        last_treatment = "formic acid"
        temp = self.temperature
        if not temp:
            if date.month >= 11 or date.month < 3:
                temp = float(2)
            elif date.month >= 3 or date.month < 5:
                temp = float(10)
            elif date.month >= 5 or date.month < 8:
                temp = float(20)
            elif date.month >= 8 or date.month < 11:
                temp = float(15)
        if date.month == 12 or date.month < 5:
            return "null"
        if honey_supers_on:
            if temp >= 10 and temp <= 26:
                return "formic acid"
            else:
                return "null"
        else:
            if hive_broodless:
                if temp > 4.4:
                    return "oxalic acid"
                else:
                    return "null"
            else:
                if temp > 26 and temp <= 30:
                    return "thymol"
                elif temp > 15 and temp <= 26:
                    if last_treatment == "formic acid":
                        return "thymol"
                    else:
                        return "formic acid"
                elif temp >= 10 and temp <= 15:
                    return "formic acid"
                else:
                    return "null"

    def select_folder(
        self, temperature=None, image=None, overrideTreatment=None, numDays=1
    ):
        curr_date = datetime.datetime.now()
        if not overrideTreatment and (curr_date.month < 3 or curr_date.month > 11):
            # don't check in winter, come back later
            return {
                "infestation": False,
                "treatment_recommendation": "None",
                "mite_count": self.mite_count,
                "delay": False,
            }
        self.temperature = float(temperature) if temperature else None
        if overrideTreatment:
            self.temperature = float(20)
        self.uploadedImage = image
        try:
            # Reset current image and boxes
            self.current_image = None
            self.current_boxes = {}
            self.green_line_enabled = {}
            self.image_confidence_thresholds = {}
            self.boxes_green_lines = {}

            # Get the new folder
            self.current_folder = (
                "C:/Users/Aashi/Documents/GitHub/VarroDetector/sample_images"
            )
            self.image_to_analyze = "C:/Users/Aashi/Documents/GitHub/VarroDetector/sample_images/IMG_6184.jpg"

            if not self.current_folder:
                return

            self.current_folder = os.path.join(self.current_folder, "")
            self.image_to_analyze = os.path.join(self.image_to_analyze, "")
            self.output_path = os.path.join(self.current_folder, "processed_images")

            # Process images
            self.process_images()

            # Run detection
            self.run_detection()

            if overrideTreatment:
                return {
                    "infestation": True,
                    "treatment_recommendation": overrideTreatment,
                    "mite_count": 100,
                    "delay": False,
                }
            self.mite_count = self.mite_count // numDays
            if (
                self.mite_count >= 9 and curr_date.month >= 3 and curr_date.month < 8
            ) or (
                self.mite_count >= 12 and curr_date.month >= 8 and curr_date.month <= 11
            ):
                treatment_recommendation = self.determine_treatment(curr_date)
                return {
                    "infestation": True,
                    "treatment_recommendation": treatment_recommendation,
                    "mite_count": self.mite_count,
                    "delay": False,
                }
            else:
                # frontend handles showing something about coming back in 3-4 months
                return {
                    "infestation": False,
                    "treatment_recommendation": "None",
                    "mite_count": self.mite_count,
                    "delay": False,
                }

        except Exception as e:
            print(f"Error in processing: {str(e)}")
            print("Error in processing:", str(e))

    def process_images(self):
        folder = "C:/Users/Aashi/Documents/GitHub/VarroDetector/sample_images"
        input_path = (
            "C:/Users/Aashi/Documents/GitHub/VarroDetector/sample_images/IMG_6098.jpg"
        )
        rel_path = os.path.relpath(input_path, folder)

        os.makedirs(self.output_path, exist_ok=True)
        print("**********************************")
        print("STEP 1: Detection of green strings")
        print("**********************************")

        output_dir = os.path.join(self.output_path, os.path.dirname(rel_path))
        os.makedirs(output_dir, exist_ok=True)
        base_output_path = os.path.join(
            self.output_path, os.path.splitext(rel_path)[0] + ".jpg"
        )
        mask_output_path = os.path.join(
            self.output_path, os.path.splitext(rel_path)[0] + ".mask.png"
        )

        glined_output_path = os.path.join(
            self.output_path, os.path.splitext(rel_path)[0] + ".g-lined.jpg"
        )

        try:
            print("Processing image")
            binary_mask = None

            # For JPGs, copy the original to be the base image
            shutil.copyfile(input_path, base_output_path)
            # Now, try to crop it from the original path
            crop_img, binary_mask = crop_green_lines(self.uploadedImage)
            if crop_img is not None:
                cv2.imwrite(glined_output_path, crop_img)
            # Save the binary mask if it was successfully generated
            if binary_mask is not None:
                cv2.imwrite(mask_output_path, binary_mask)

        except Exception as e:
            print(f"Error processing image {rel_path}: {str(e)}")
            # Ensure the base image exists even if cropping fails
            if not os.path.exists(base_output_path) and not input_path.lower().endswith(
                ".dng"
            ):
                shutil.copyfile(input_path, base_output_path)
                shutil.copyfile(input_path, base_output_path)
                shutil.copyfile(input_path, base_output_path)
                shutil.copyfile(input_path, base_output_path)

    def run_detection(self):
        # self.image_listbox.configure(state="disabled")
        if not self.output_path or not os.path.exists(self.output_path):
            return

        try:
            print("\n**********************************")
            print("STEP 2: Performing inference")
            print("**********************************")

            suma = 0
            img_str = self.uploadedImage
            if "," in img_str:
                img_str = img_str.split(",")[1]

            img_bytes = base64.b64decode(img_str)
            pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            results = self.model(
                source=pil_img,
                imgsz=(6016),
                max_det=2000,
                conf=0.1,
                iou=0.5,
                save=True,
                show_labels=False,
                line_width=2,
                save_txt=True,
                save_conf=True,
                # project=os.path.dirname(output_dir),
                # name=os.path.basename(output_dir) if rel_dir else "predict 0.1",
                verbose=False,
                batch=1,
                exist_ok=True,
            )
            for result in results:
                self.mite_count = len(result.boxes)
                suma += len(result.boxes)

            print("\nTotal varroas detected:", suma)
            print("Analysis complete")

        except Exception as e:
            print(f"Error in detection: {str(e)}")
            print("Error in detection:", str(e))
            print("Error in detection:", str(e))
