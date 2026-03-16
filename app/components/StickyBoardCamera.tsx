import * as ImageManipulator from "expo-image-manipulator";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RNFS from "react-native-fs";
import { Camera, useCameraDevice } from "react-native-vision-camera";
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const FRAME_W = 300;
const FRAME_H = 300 * (11 / 8.5);

export default function StickyBoardCamera({
  onPhoto,
  onClose,
}: {
  onPhoto: (uri: string, base64: string) => void;
  onClose: () => void;
}) {
  const device = useCameraDevice("back");
  const camera = useRef<Camera>(null);

  if (!device) return null;

  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraLayout, setCameraLayout] = useState({ width: 0, height: 0 });

  const takePhoto = async () => {
    if (!camera.current || isCapturing) return;
    if (cameraLayout.width === 0) return; // layout not measured yet
    setIsCapturing(true);

    try {
      const photo = await camera.current.takePhoto();
      const photoUri = `file://${photo.path}`;

      const isRotated = photo.width > photo.height;
      const imgW = isRotated ? photo.height : photo.width;
      const imgH = isRotated ? photo.width : photo.height;

      // Use actual rendered camera dimensions, not screen dimensions
      const previewW = cameraLayout.width;
      const previewH = cameraLayout.height;

      // Frame position relative to the camera preview
      const frameX = (previewW - FRAME_W) / 2;
      const frameY = (previewH - FRAME_H) / 2;

      // Scale from preview coords → sensor coords
      const scaleX = imgW / previewW;
      const scaleY = imgH / previewH;

      let cropX = Math.round(frameX * scaleX);
      let cropY = Math.round(frameY * scaleY);
      let cropW = Math.round(FRAME_W * scaleX);
      let cropH = Math.round(FRAME_H * scaleY);

      cropX = Math.max(0, cropX);
      cropY = Math.max(0, cropY);
      cropW = Math.min(cropW, imgW - cropX);
      cropH = Math.min(cropH, imgH - cropY);

      console.log("Preview:", previewW, previewH);
      console.log("Sensor:", imgW, imgH);
      console.log("Crop:", cropX, cropY, cropW, cropH);

      if (cropW <= 0 || cropH <= 0) {
        const base64 = await RNFS.readFile(photo.path, "base64");
        onPhoto(photoUri, base64);
        return;
      }

      const cropped = await ImageManipulator.manipulateAsync(
        photoUri,
        [
          {
            crop: {
              originX: cropX,
              originY: cropY,
              width: cropW,
              height: cropH,
            },
          },
        ],
        {
          compress: 0.9,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );

      onPhoto(cropped.uri, cropped.base64 ?? "");
    } catch (e) {
      console.error("takePhoto failed:", e);
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View
        style={StyleSheet.absoluteFill}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setCameraLayout({ width, height });
        }}
      >
        <Camera
          ref={camera}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          photo={true}
        />
      </View>
      <View style={styles.overlay}>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.capture, isCapturing && styles.captureActive]}
        onPress={takePhoto}
        disabled={isCapturing}
      >
        {isCapturing ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={{ color: "white" }}>Capture</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity style={styles.close} onPress={onClose}>
        <Text style={{ color: "white" }}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },

  frame: {
    width: FRAME_W,
    height: FRAME_H,
  },

  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "white",
  },

  topLeft: {
    top: 0,
    left: 0,
    borderLeftWidth: 4,
    borderTopWidth: 4,
  },

  topRight: {
    top: 0,
    right: 0,
    borderRightWidth: 4,
    borderTopWidth: 4,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },

  capture: {
    position: "absolute",
    bottom: 80,
    alignSelf: "center",
    backgroundColor: "black",
    padding: 18,
    borderRadius: 40,
  },
  close: {
    position: "absolute",
    top: 60,
    left: 20,
  },
  captureActive: {
    backgroundColor: "#444",
    opacity: 0.7,
  },
});
