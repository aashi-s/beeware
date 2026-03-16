import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { COLOURS } from "../styles/styles";

export default function OnboardingSolution() {
  return (
    <View style={styles.page}>
      <View style={styles.tag}>
        <Text style={styles.tagText}>Our Solution</Text>
      </View>
      <Text style={styles.h1}>How BeeWare fits in</Text>
      <Text style={styles.body}>
        BeeWare replaces your hive’s outer lid with a smart device that monitors
        and treats mites.
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
            name="camera"
            color={COLOURS.colour3}
            size={18}
          />
        </View>
        <View>
          <Text style={styles.h2}>Mite Counting</Text>
          <Text style={{ width: "54%", color: "#717182" }}>
            Our model counts the mites on your sticky board to determine
            infestation.
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
            name="lightning-bolt-outline"
            color={COLOURS.colour3}
            size={18}
          />
        </View>
        <View>
          <Text style={styles.h2}>Automated Treatment</Text>
          <Text style={{ width: "54%", color: "#717182" }}>
            When treatment is warranted, BeeWare's device applies it directly to
            your hive.
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
            name="shield-outline"
            color={COLOURS.colour3}
            size={18}
          />
        </View>
        <View>
          <Text style={styles.h2}>You Stay in Control</Text>
          <Text style={{ width: "54%", color: "#717182" }}>
            Nothing happens without your input. We recommend, you approve.
          </Text>
        </View>
      </View>
      <Text style={[styles.h2, { marginTop: 35 }]}>
        Treatment Season in Ontario
      </Text>
      <Text>
        Due to mite behaviour and treatment temperature requirements, device is
        only enabled March – October. Device is removed from the hive in the
        winter months.
      </Text>
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
