import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import OnboardingFour from "../../assets/onboarding4.svg";
import { COLOURS } from "../styles/styles";

export default function OnboardingTreatment() {
  return (
    <View style={styles.page}>
      <OnboardingFour style={{ alignSelf: "center" }} height={130} />
      <View style={styles.tag}>
        <Text style={styles.tagText}>Treatment</Text>
      </View>
      <Text style={styles.h1}>Applying mite treatment</Text>
      <Text style={styles.body}>
        Your BeeWare device has three built-in reservoirs to store the treatment
        solutions (sold separately). All you need to do is refill them.
      </Text>
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
          <MaterialCommunityIcons
            name="eyedropper"
            color={COLOURS.colour3}
            size={18}
          />
        </View>
        <View style={{ width: "80%" }}>
          <Text style={styles.h2}>Oxalic Acid </Text>
          <Text style={{ color: "#717182" }}>
            Sprays directly on hive to kill phoretic mites. No action required
            after treatment.
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
          <MaterialCommunityIcons
            name="leaf"
            color={COLOURS.colour3}
            size={18}
          />
        </View>
        <View style={{ width: "80%" }}>
          <Text style={styles.h2}>Thymol</Text>
          <Text style={{ color: "#717182" }}>
            A natural solution dispensed on foam pads that evaporates slowly
            through the hive. Pads must be removed 28 days after first
            application.
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
          <MaterialCommunityIcons
            name="beaker-outline"
            color={COLOURS.colour3}
            size={18}
          />
        </View>
        <View style={{ width: "80%" }}>
          <Text style={styles.h2}>Formic Acid</Text>
          <Text style={{ color: "#717182" }}>
            Treatment dispensed on foam pads that can penetrate through the
            brood cells. Pads must be removed 24 days after first application.
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
