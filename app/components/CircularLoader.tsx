import { MaterialCommunityIcons } from "@expo/vector-icons"; // for checkmark
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";
import Svg, { Circle } from "react-native-svg";
import { COLOURS } from "../styles/styles";

interface CircularLoaderProps {
  duration?: number;
  isLoading: boolean;
  version: "detection" | "treatment";
  error?: boolean;
  setImageModalVisible: (val: boolean) => void;
  detectionResultImageURI?: string;
  imageModalVisible: boolean;
}

const CircularLoader: React.FC<CircularLoaderProps> = ({
  duration = 5000,
  isLoading,
  version,
  error = false,
  setImageModalVisible,
  detectionResultImageURI,
  imageModalVisible,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isLoading) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        if (!error) {
          setCompleted(true);
          setTimeout(() => setShowResults(true), 500); // ← add this
        }
        setTextIndex(-1);
      });
    }
  }, [isLoading, error]);

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const [completed, setCompleted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [textIndex, setTextIndex] = useState(0);

  const texts =
    version == "detection"
      ? [
          "Analyzing your sticky board...",
          "Counting your mite levels...",
          "Determining infestation status...",
        ]
      : [
          "Connecting to device...",
          "Checking treatment levels..",
          "Activating pump...",
        ];

  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (completed || error) return;

    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % texts.length);
    }, duration / texts.length);

    return () => clearInterval(interval);
  }, [completed, error, duration]);

  useEffect(() => {
    // Stage 1: animate slowly to 90%
    Animated.timing(animatedValue, {
      toValue: 0.9,
      duration,
      useNativeDriver: true,
    }).start();
  }, []);

  // interpolated strokeDashoffset
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.container, { paddingTop: showResults ? 0 : 70 }]}>
      {!showResults && (
        <View style={{ width: size, height: size, position: "relative" }}>
          <Svg width={size} height={size}>
            {/* background ring */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#eee"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* progress ring */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={error ? "#FF0014" : "#FDD835"}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
              fill="none"
            />
          </Svg>

          {/* center icon */}
          <MaterialCommunityIcons
            name={error ? "alert-circle-outline" : completed ? "check" : "bee"}
            size={48}
            color={error ? "#FF0014" : completed ? COLOURS.colour3 : "#000"}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              marginLeft: -24, // half of icon size
              marginTop: -24, // half of icon size
            }}
          />
        </View>
      )}
      {/* loading text */}
      {completed && !error ? (
        <View style={{ alignItems: "center" }}>
          {!showResults && (
            <Text style={styles.text}>Sticky board analysis complete.</Text>
          )}

          {showResults && ( // ← wrap everything below in this
            <View style={{ gap: 10 }}>
              <Text
                style={{
                  paddingVertical: 10,
                  color: COLOURS.darkGrey,
                  textAlign: "center",
                }}
              >
                Varroa mites found with detection software:
              </Text>
              <TouchableOpacity onPress={() => setImageModalVisible(true)}>
                {detectionResultImageURI && (
                  <Image
                    source={{
                      uri: `data:image/jpeg;base64,${detectionResultImageURI}`,
                    }}
                    style={{
                      width: 292,
                      height: 332,
                      alignSelf: "center",
                      borderRadius: 12,
                      borderColor: "#C5C6CC",
                      borderWidth: 5,
                    }}
                  />
                )}
              </TouchableOpacity>

              <Modal
                isVisible={imageModalVisible}
                onBackdropPress={() => setImageModalVisible(false)}
                onBackButtonPress={() => setImageModalVisible(false)}
                backdropOpacity={1}
                backdropColor="white"
              >
                <Pressable
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.85)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  onPress={() => setImageModalVisible(false)}
                >
                  {detectionResultImageURI && (
                    <Image
                      source={{
                        uri: `data:image/jpeg;base64,${detectionResultImageURI}`,
                      }}
                      style={{ width: "98%", height: "98%", borderRadius: 12 }}
                      resizeMode="contain"
                    />
                  )}
                </Pressable>
              </Modal>
            </View>
          )}
        </View>
      ) : (
        <Text style={[styles.text, error && { color: "#FF0014" }]}>
          {error ? "Something went wrong. Please try again." : texts[textIndex]}
        </Text>
      )}
    </View>
  );
};

export default CircularLoader;

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },

  text: {
    marginTop: 70,
    fontSize: 14,
    color: "#7E7E7E",
    textAlign: "center",
  },
});

{
  /* <View style={{ gap: 24 }}>
  <Text
    style={{
      paddingVertical: 10,
      color: COLOURS.darkGrey,
      textAlign: "center",
    }}
  >
    Varroa mites found with detection software:
  </Text>

  <>
    <TouchableOpacity onPress={() => setImageModalVisible(true)}>
      {detectionResultImageURI && (
        <Image
          source={{
            uri: `data:image/jpeg;base64,${detectionResultImageURI}`,
          }}
          style={{
            width: 292,
            height: 332,
            alignSelf: "center",
            borderRadius: 12,
            borderColor: "#C5C6CC",
            borderWidth: 5,
          }}
        />
      )}
    </TouchableOpacity>

    <Modal
      isVisible={imageModalVisible}
      onBackdropPress={() => setImageModalVisible(false)}
      onBackButtonPress={() => setImageModalVisible(false)}
      backdropOpacity={1}
      backdropColor="white"
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.85)",
          justifyContent: "center",
          alignItems: "center",
        }}
        onPress={() => setImageModalVisible(false)}
      >
        {detectionResultImageURI && (
          <Image
            source={{
              uri: `data:image/jpeg;base64,${detectionResultImageURI}`,
            }}
            style={{
              width: "98%",
              height: "98%",
              borderRadius: 12,
            }}
            resizeMode="contain"
          />
        )}
      </Pressable>
    </Modal>
  </>
</View>; */
}
