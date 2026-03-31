import { Dimensions, StyleSheet, Text, View } from "react-native";
import OnboardingOne from "../../assets/onboarding1.svg";
import { COLOURS } from "../styles/styles";

export default function OnboardingWelcome() {
  return (
    <View style={styles.page}>
      <OnboardingOne style={{ alignSelf: "center" }} height={130} />
      <View style={styles.tag}>
        <Text style={styles.tagText}>Welcome to BeeWare</Text>
      </View>
      <Text style={styles.h1}>Your best defence against Varroa mites</Text>
      <Text style={styles.body}>
        Let's get you set up in just a few minutes. We'll walk you through
        everything you need to know about Varroa mites and how to install your
        BeeWare device.
      </Text>
      <View
        style={{
          marginTop: 25,
          backgroundColor: "#FFF4E4",
          borderColor: COLOURS.tertiary,
          borderWidth: 1,
          padding: 17,
          borderRadius: 14,
          gap: 5,
        }}
      >
        <Text style={styles.h2}>What we'll cover</Text>
        <Text style={styles.body}>
          • What Varroa mites are and why they matter
        </Text>
        <Text style={styles.body}>• How sticky board monitoring works</Text>
        <Text style={styles.body}>• How BeeWare automates the process</Text>
        <Text style={styles.body}>• Installing your BeeWare device</Text>
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
