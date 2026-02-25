import { MaterialCommunityIcons } from "@expo/vector-icons"; // for checkmark
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { COLOURS } from "../styles/styles";

interface CircularLoaderProps {
  duration?: number;
  isLoading: boolean;
}

const CircularLoader: React.FC<CircularLoaderProps> = ({
  duration = 5000,
  isLoading,
}) => {
  useEffect(() => {
    if (!isLoading) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setCompleted(true);
        setTextIndex(-1);
      });
    }
  }, [isLoading]);

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const [completed, setCompleted] = useState(false);
  const [textIndex, setTextIndex] = useState(0);

  const texts = [
    "Analyzing your sticky board...",
    "Counting your mite levels...",
    "Determining infestation status...",
  ];

  const animatedValue = useRef(new Animated.Value(0)).current;

  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (completed) return;

    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % texts.length);
    }, duration / texts.length);

    return () => clearInterval(interval);
  }, [completed, duration]);

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
    <View style={styles.container}>
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
            stroke="#FDD835"
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
          name={completed ? "check" : "bee"}
          size={48}
          color={completed ? COLOURS.colour3 : "#000"}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            marginLeft: -24, // half of icon size
            marginTop: -24, // half of icon size
          }}
        />
      </View>

      {/* loading text */}
      <Text style={styles.text}>
        {completed ? "Sticky board analysis complete." : texts[textIndex]}
      </Text>
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
