import base64
import datetime
import math
import os
import shutil
import sys
import threading

import cv2
import numpy as np
import rawpy
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


def decode_image(image):
    if not image:
        return None
    base64_str = image
    # If the base64 string includes a prefix like "data:image/png;base64,", remove it:
    if image.startswith("data:image"):
        base64_str = image.split(",")[1]

    # Decode the base64 string into bytes
    image_bytes = base64.b64decode(base64_str)

    # Convert bytes to a NumPy array
    nparr = np.frombuffer(image_bytes, np.uint8)

    # Decode the image (similar to cv2.imread)
    deocded = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return deocded


def crop_green_lines(base64_str):
    """Detect green lines from file."""

    # Decode the image (similar to cv2.imread)
    initial_img = decode_image(base64_str)
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

    # def verify_image(self, encodedImage=None):
    #     try:

    #         def variance_of_laplacian(image):
    #             return cv2.Laplacian(image, cv2.CV_64F).var()

    #         image = decode_image(encodedImage)

    #         if image is None:
    #             return {"verified": False}

    #         h, w = image.shape[:2]

    #         # Reject very small images
    #         if h < 100 or w < 100:
    #             print("too small")
    #             return {"verified": False}

    #         gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    #         brightness = np.mean(gray)
    #         contrast = gray.std()

    #         # Reject completely dark or overexposed images
    #         if brightness < 40 or brightness > 220:
    #             print("dark or overexposed", brightness)
    #             return {"verified": False}

    #         # Reject extremely low contrast images
    #         if contrast < 20:
    #             print("low contrast")
    #             return {"verified": False}

    #         # Try enhancement if slightly dark
    #         trials = 0
    #         while brightness < 100 and trials < 2:
    #             trials += 1

    #             lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)

    #             clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    #             lab[:, :, 0] = clahe.apply(lab[:, :, 0])

    #             image = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    #             # gamma brighten shadows
    #             gamma = 0.7
    #             image = np.clip((image / 255.0) ** gamma * 255, 0, 255).astype(np.uint8)

    #             gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    #             brightness = np.mean(gray)

    #         # Blur detection
    #         fm = variance_of_laplacian(gray)

    #         if fm < 80:
    #             print("too blurry", fm)
    #             return {"verified": False}

    #         # Detect glare / flash saturation
    #         _, binary_image = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
    #         bright_ratio = np.sum(binary_image == 255) / (h * w)

    #         if bright_ratio > 0.2:  # too much glare
    #             print(bright_ratio, "glare")
    #             return {"verified": False}

    #         return {"verified": True}

    #     except Exception as e:
    #         print("Error in processing:", str(e))
    #         return {"verified": False}

    def verify_image(self, encodedImage=None):
        try:
            image = decode_image(encodedImage)
            # if image is None:
            #     print("error: no image")
            #     return {"verified": False, "reason": "Please resubmit your image."}

            h, w = image.shape[:2]

            # if h < 100 or w < 100:
            #     print("error: too small")
            #     return {
            #         "verified": False,
            #         "reason": "Please try again with a bigger image.",
            #     }

            # aspect_ratio = w / h
            # if aspect_ratio < 0.3 or aspect_ratio > 5.0:
            #     print("error: incorrect aspect ratio")
            #     return {
            #         "verified": False,
            #         "reason": "Please try again with an appropriate aspect ratio.",
            #     }

            # gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            # brightness = np.mean(gray)
            # contrast = gray.std()

            # if brightness < 40 or brightness > 220:
            #     print("error: low exposure")
            #     return {
            #         "verified": False,
            #         "reason": "Please improve the exposure and try again.",
            #     }

            # if contrast < 20:
            #     print("error: low contrast")
            #     return {
            #         "verified": False,
            #         "reason": "Please increase contrast and try again.",
            #     }

            # # Enhancement loop (on a copy)
            enhanced = image.copy()
            # trials = 0
            # while (
            #     np.mean(cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY)) < 100 and trials < 2
            # ):
            #     trials += 1
            #     lab = cv2.cvtColor(enhanced, cv2.COLOR_BGR2LAB)
            #     clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            #     lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            #     enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
            #     gamma = 0.7
            #     enhanced = np.clip((enhanced / 255.0) ** gamma * 255, 0, 255).astype(
            #         np.uint8
            #     )

            gray = cv2.cvtColor(enhanced, cv2.COLOR_BGR2GRAY)

            fm = cv2.Laplacian(gray, cv2.CV_64F).var()
            print("blur level", fm)
            if fm < 80:
                print("error: blurry")
                return {
                    "verified": False,
                    "reason": "Please retry with a less blurry image.",
                }

            # noise = cv2.meanStdDev(gray)[1][0][0]
            # if noise > 80:
            #     print("error: grainy")
            #     return {
            #         "verified": False,
            #         "reason": "Please retry with brighter lighting.",
            #     }

            # edges = cv2.Canny(gray, 50, 150)
            # if np.sum(edges > 0) / (h * w) < 0.01:
            #     print("error: greyscale")
            #     return {
            #         "verified": False,
            #         "reason": "Please retry with a different image.",
            #     }

            # Glare check with connected components
            # _, binary_image = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY)
            # num_labels, _, stats, _ = cv2.connectedComponentsWithStats(binary_image)
            # for i in range(1, num_labels):
            #     if stats[i, cv2.CC_STAT_AREA] > (h * w * 0.05):
            #         print("error: glare")
            #         return {
            #             "verified": False,
            #             "reason": "Please retry with less glare.",
            #         }

            return {"verified": True}

        except Exception as e:
            print("Error in verify_image:", str(e))
            return {"verified": False, "reason": "Please retry."}

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
        honey_supers_on: bool = self.supersOn == "yes"
        hive_broodless: bool = self.broodless == "yes"

        last_treatment = "formic acid"  # will grab from database
        temp = self.temperature
        # this is me getting a temperature when we're not connected to microcontroller lol
        if not temp:
            if date.month >= 11 or date.month < 3:
                temp = float(2)
            elif date.month >= 3 or date.month < 5:
                temp = float(10)
            elif date.month >= 5 or date.month < 8:
                temp = float(20)
            elif date.month >= 8 or date.month < 11:
                temp = float(15)
        # dont treat dec-feb
        if date.month == 12 or date.month < 3:
            return {
                "treatment_recommendation": "null",
                "delay": False,
                "temp_range": [],
                "annotated_image": self.annotated_image,
            }
        if honey_supers_on:
            if temp >= 10 and temp <= 26:
                return {
                    "treatment_recommendation": "formic acid",
                    "delay": False,
                    "temp_range": [],
                    "annotated_image": self.annotated_image,
                }
            else:
                return {
                    "treatment_recommendation": "formic acid",
                    "delay": True,
                    "temp_range": [10, 26],
                    "annotated_image": self.annotated_image,
                }
        else:
            if hive_broodless:
                if temp > 4.4:
                    return {
                        "treatment_recommendation": "oxalic acid",
                        "delay": False,
                        "temp_range": [],
                        "annotated_image": self.annotated_image,
                    }
                else:
                    return {
                        "treatment_recommendation": "oxalic acid",
                        "delay": True,
                        "temp_range": [4.4, 100],
                        "annotated_image": self.annotated_image,
                    }
            else:
                if temp > 26 and temp <= 30:
                    return {
                        "treatment_recommendation": "thymol",
                        "delay": False,
                        "temp_range": [],
                        "annotated_image": self.annotated_image,
                    }
                elif temp > 15 and temp <= 26:
                    if last_treatment == "formic acid":
                        return {
                            "treatment_recommendation": "thymol",
                            "delay": False,
                            "temp_range": [],
                            "annotated_image": self.annotated_image,
                        }
                    else:
                        return {
                            "treatment_recommendation": "formic acid",
                            "delay": False,
                            "temp_range": [],
                            "annotated_image": self.annotated_image,
                        }
                elif temp >= 10 and temp <= 15:
                    return {
                        "treatment_recommendation": "formic acid",
                        "delay": False,
                        "temp_range": [],
                        "annotated_image": self.annotated_image,
                    }
                else:
                    return {
                        "treatment_recommendation": "formic acid",
                        "delay": True,
                        "temp_range": [10, 15],
                        "annotated_image": self.annotated_image,
                    }

    def select_folder(
        self,
        broodless,
        supersOn,
        temperature=None,
        image=None,
        overrideTreatment=None,
        numDays=1,
    ):
        self.annotated_image = None
        curr_date = datetime.datetime.now()
        if not overrideTreatment and (curr_date.month < 3 or curr_date.month > 11):
            # don't check in winter, come back later
            return {
                "infestation": False,
                "treatment_recommendation": "None",
                "mite_count": self.mite_count,
                "delay": False,
                "temp_range": [],
                "annotated_image": self.annotated_image,
            }
        self.temperature = float(temperature) if temperature else None
        self.broodless = broodless
        self.supersOn = supersOn
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
            # self.process_and_detect()
            # Process images
            self.process_images()

            # # Run detection
            self.run_detection()

            self.mite_count = max(self.mite_count // numDays, 12)
            if overrideTreatment and self.mite_count > 9:
                return {
                    "infestation": True,
                    "treatment_recommendation": overrideTreatment,
                    "mite_count": self.mite_count,
                    "delay": False,
                    "temp_range": [],
                    "annotated_image": self.annotated_image,
                }
            if (
                self.mite_count >= 9 and curr_date.month >= 3 and curr_date.month < 8
            ) or (
                self.mite_count >= 12 and curr_date.month >= 8 and curr_date.month <= 11
            ):
                treatment_data = self.determine_treatment(curr_date)
                return {
                    "infestation": True,
                    "treatment_recommendation": treatment_data[
                        "treatment_recommendation"
                    ],
                    "mite_count": self.mite_count,
                    "delay": treatment_data["delay"],
                    "temp_range": treatment_data["temp_range"],
                    "annotated_image": self.annotated_image,
                }
            else:
                # frontend handles showing something about coming back in 3-4 months
                return {
                    "infestation": False,
                    "treatment_recommendation": "None",
                    "mite_count": self.mite_count,
                    "delay": False,
                    "temp_range": [],
                    "annotated_image": self.annotated_image,
                }

        except Exception as e:
            print(f"Error in processing: {str(e)}")
            print("Error in processing:", str(e))

    def process_and_detect(self):
        """
        Single pipeline: decode → crop to green lines → run YOLO → return annotated result.
        Replaces the old process_images() + run_detection() split.
        """
        print("**********************************")
        print("STEP 1: Green line crop")
        print("**********************************")

        # Decode the raw uploaded image (BGR)
        raw_image = decode_image(self.uploadedImage)
        if raw_image is None:
            raise ValueError("Could not decode uploaded image")

        # Attempt green-line crop; fall back to full image
        crop_img, binary_mask = crop_green_lines(self.uploadedImage)
        if crop_img is not None:
            print("Green lines detected — using cropped image for inference")
            inference_image = crop_img
        else:
            print("No green lines detected — using full image for inference")
            inference_image = raw_image

        print("\n**********************************")
        print("STEP 2: YOLO inference")
        print("**********************************")

        # Size to nearest multiple of 32, preserving aspect ratio
        h, w = inference_image.shape[:2]
        imgsz = (round(h / 32) * 32, round(w / 32) * 32)
        print(f"Image size: {w}x{h} → inference size: {imgsz[1]}x{imgsz[0]}")

        results = self.model(
            source=inference_image,
            imgsz=imgsz,
            max_det=2000,
            conf=0.1,
            iou=0.5,
            save=False,
            show_labels=False,
            line_width=2,
            verbose=False,
            batch=1,
        )

        self.mite_count = 0
        self.annotated_image = None

        for result in results:
            self.mite_count = len(result.boxes)

            # Draw boxes directly on BGR image — no channel flipping needed
            annotated = inference_image.copy()
            for box in result.boxes.xyxy.cpu().numpy():
                x1, y1, x2, y2 = map(int, box[:4])
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 255), 6)

            _, buffer = cv2.imencode(".jpg", annotated)
            self.annotated_image = base64.b64encode(buffer).decode("utf-8")

        print(f"\nTotal varroa detected: {self.mite_count}")
        return self.mite_count, self.annotated_image

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

            image = decode_image(self.uploadedImage)
            results = self.model(
                source=image,
                imgsz=(6016),
                max_det=2100,
                conf=0.1,
                iou=0.5,
                save=False,
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
            annotated_base64 = None
            for result in results:
                self.mite_count = len(result.boxes)
                # draw boxes
                annotated = image.copy()
                annotated = np.array(annotated)
                annotated = cv2.cvtColor(annotated, cv2.COLOR_RGB2BGR)

                for box in result.boxes.xyxy.cpu().numpy():
                    x1, y1, x2, y2 = map(int, box[:4])
                    cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 255), 6)
                # convert BGR -> RGB
                annotated = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)

                # encode image to base64
                _, buffer = cv2.imencode(".jpg", annotated)
                annotated_base64 = base64.b64encode(buffer).decode("utf-8")
                self.annotated_image = annotated_base64

                # save annotated image locally with datetime filename
                script_dir = os.path.dirname(os.path.abspath(__file__))
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                cv2.imwrite(os.path.join(script_dir, f"{timestamp}.jpg"), annotated)
                os.makedirs("snapshots", exist_ok=True)
                cv2.imwrite(f"snapshots/{timestamp}.jpg", annotated)

            print("\nTotal varroas detected:", self.mite_count)
            print("Analysis complete")

        except Exception as e:
            print(f"Error in detection: {str(e)}")
            print("Error in detection:", str(e))
            print("Error in detection:", str(e))
