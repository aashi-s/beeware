import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { COLOURS } from "../styles/styles";

export default function OnboardingFinal() {
  return (
    <View style={styles.page}>
      <View style={styles.tag}>
        <Text style={styles.tagText}>Set Up</Text>
      </View>
      <View>
        <Text style={[styles.h1]}>You're all set!</Text>
        <Text style={[styles.body, { width: "90%", marginTop: 15 }]}>
          Your BeeWare device is installed and your first monitoring cycle is
          underway. Check back in 24 hours for your first mite count report.
        </Text>
      </View>
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
        <Text style={[styles.h2, { marginBottom: 12 }]}>Quick Recap</Text>
        <Text
          style={[
            styles.body,
            {
              borderBottomColor: "#FEF3C6",
              borderBottomWidth: 1,
              paddingBottom: 13,
            },
          ]}
        >
          • Remove after 24 hours
        </Text>
        <Text
          style={[
            styles.body,
            {
              borderBottomColor: "#FEF3C6",
              borderBottomWidth: 1,
              paddingBottom: 13,
            },
          ]}
        >
          • Place a sticky board tonight
        </Text>
        <Text
          style={[
            styles.body,
            {
              borderBottomColor: "#FEF3C6",
              borderBottomWidth: 1,
              paddingBottom: 13,
            },
          ]}
        >
          • Photograph and upload in the app
        </Text>
        <Text
          style={[
            styles.body,
            {
              paddingBottom: 13,
            },
          ]}
        >
          • Review results and approve treatment if needed
        </Text>
      </View>
      <View style={styles.helpPrompt}>
        <MaterialCommunityIcons
          name="information-outline"
          color={COLOURS.darkGrey}
          size={18}
        />
        <Text>Need help? Tap Settings → Help in the app.</Text>
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
