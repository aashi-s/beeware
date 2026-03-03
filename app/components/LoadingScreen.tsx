import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

const loadingMessages = [
  "Counting your mite levels…",
  "Analyzing your sticky board…",
  "Determining infestation status…",
];

export default function LoadingScreen() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2000); // change message every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#f5c65c" />

      <Text style={styles.text}>{loadingMessages[messageIndex]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fdf6e3",
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: "#000",
    textAlign: "center",
  },
});
