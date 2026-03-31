import { Dimensions, StyleSheet, Text, View } from "react-native";
import { COLOURS } from "../styles/styles";

export default function OnboardingSetupOne() {
  return (
    <View style={styles.page}>
      <View style={styles.tag}>
        <Text style={styles.tagText}>Set up</Text>
      </View>
      <Text style={styles.h1}>Installation in hive</Text>
      <Text style={styles.body}>
        Get your BeeWare device up and running in minutes.
      </Text>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          marginTop: 22,
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#FFF4E4",
            borderRadius: 100,
            padding: 11,
            height: 40,
            width: 40,
          }}
        >
          <Text style={{ fontWeight: 700, color: COLOURS.colour3 }}>1</Text>
        </View>
        <View style={{ width: "150%" }}>
          <Text style={styles.h2}>Remove your old hive lid</Text>
          <Text style={{ width: "54%", color: "#717182" }}>
            Take off the existing top cover from your hive. Store it in a safe
            place, you’ll need it for the winter months.
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 22 }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#FFF4E4",
            borderRadius: 100,
            padding: 11,
            height: 40,
            width: 40,
          }}
        >
          <Text style={{ fontWeight: 700, color: COLOURS.colour3 }}>2</Text>
        </View>
        <View style={{ width: "150%" }}>
          <Text style={styles.h2}>Replace with the BeeWare lid</Text>
          <Text style={{ width: "54%", color: "#717182" }}>
            Place the BeeWare smart lid on top of your hive body. It fits
            standard Langstroth 5 frame hive dimensions.
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 22 }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: "#FFF4E4",
            borderRadius: 100,
            padding: 11,
            height: 40,
            width: 40,
          }}
        >
          <Text style={{ fontWeight: 700, color: COLOURS.colour3 }}>3</Text>
        </View>
        <View style={{ width: "150%" }}>
          <Text style={styles.h2}>Add treatments to reservoirs</Text>
          <Text style={{ width: "54%", color: "#717182" }}>
            Fill the three built-in reservoirs with the treatment solutions
            (Oxalic Acid, Thymol, and Formic Acid). Simply unscrew the caps,
            pour, and reseal. Follow the label for specific instructions
            regarding safety and handling.
          </Text>
        </View>
      </View>
    </View>
  );
}
const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },

  page: {
    width,
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  text: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 20,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "black",
    marginHorizontal: 6,
  },

  backButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    borderColor: "#C5C6CC",
    borderWidth: 1,
    alignItems: "center",
    width: "40%",
  },
  nextButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLOURS.colour3,
    alignItems: "center",
    width: "40%",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 10,
    marginTop: 84,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    marginHorizontal: 2, // space between segments
    borderRadius: 2,
  },
  progressText: {
    marginHorizontal: 20,
    marginTop: 5,
    color: "#333",
    flexDirection: "row",
    justifyContent: "space-between",
  },

  tag: {
    backgroundColor: "#FFF7E6",
    paddingHorizontal: 10,
    paddingBlock: 5,
    borderRadius: 100,
    alignItems: "center",
    display: "flex",
    alignSelf: "flex-start",
    marginTop: 20,
    marginBottom: 12.5,
  },
  tagText: { color: COLOURS.colour3, fontWeight: 500 },
  h1: {
    fontWeight: 800,
    fontSize: 24,
    width: "75%",
    marginBottom: 7.5,
  },
  h2: {
    fontWeight: 700,
    lineHeight: 20,
    fontSize: 16,
    marginBottom: 4,
  },
  body: {
    color: "#717182",
  },
  helpPrompt: {
    backgroundColor: "#F9F9FB",
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    color: "#717182",
    marginTop: 20,
    gap: 10,
  },
});
