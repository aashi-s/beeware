import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLOURS } from "../styles/styles";

type Props = {
  treatment: string;
  dates: Date[];
};

export default function TreatmentTimeline({ treatment, dates }: Props) {
  const steps = treatment == "Formic Acid" ? 5 : treatment == "Thymol" ? 3 : 1;
  const quantity = treatment == "Formic Acid" ? 20 : 50;
  const timeline =
    treatment == "Formic Acid" ? 24 : treatment == "Thymol" ? 28 : 1;

  const formatDate = (date: Date) =>
    date.toLocaleString("en-US", { month: "short", day: "numeric" });

  const formatDateLong = (date: Date) =>
    date.toLocaleString("en-US", { month: "long", day: "numeric" });

  return (
    <View style={{ gap: 24 }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: "#FFEEC3",
          backgroundColor: "#FFFDF7",
          padding: 17,
          borderRadius: 12,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 21,
            marginBottom: 5,
          }}
        >
          {treatment} Application Recommendation
        </Text>
        <Text style={{ color: COLOURS.darkGrey, lineHeight: 20 }}>
          {treatment == "Oxalic Acid"
            ? "50 mL of treatment automatically applied one time. No foam pad required."
            : `${quantity} mL of treatment automatically applied on to a foam pad ${steps - 1} times over ${timeline} days`}
        </Text>
        {treatment == "Oxalic Acid" ? (
          <View style={styles.step}>
            <View style={styles.lastCircle}>
              <MaterialCommunityIcons
                name="check-circle"
                size={46}
                color="#37c09e"
                style={{ alignSelf: "center" }}
              />
            </View>

            <Text style={styles.finalDate}>{formatDate(dates[0])}</Text>
          </View>
        ) : (
          <View style={styles.container}>
            <View style={styles.line} />
            {dates.map((date, i) => (
              <View key={i} style={styles.step}>
                {i === steps - 1 ? (
                  <View style={styles.lastCircle}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={46}
                      color="#37c09e"
                      style={{ alignSelf: "center", borderColor: "#37c09e" }}
                    />
                  </View>
                ) : (
                  <View style={styles.circle}>
                    <Text style={styles.number}>{i + 1}</Text>
                  </View>
                )}

                <Text style={i === steps - 1 ? styles.finalDate : styles.date}>
                  {formatDate(date)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {treatment !== "Oxalic Acid" && (
        <Text style={{ color: COLOURS.darkGrey }}>
          On{" "}
          <Text style={{ fontWeight: 700 }}>
            {formatDateLong(dates[dates.length - 1])}
          </Text>
          , remove the foam pads from your hive. Don’t worry, we’ll remind you!
        </Text>
      )}
    </View>
  );
}

const CIRCLE = 44;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    position: "relative",
  },

  line: {
    position: "absolute",
    top: CIRCLE / 2 + 10,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#E6C98A",
  },

  step: {
    alignItems: "center",
    width: CIRCLE,
    alignSelf: "center",
    marginTop: 10,
  },

  lastCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: "#FFFDF7",
    justifyContent: "center",
    alignItems: "center",
  },

  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: "#D86F1C",
    justifyContent: "center",
    alignItems: "center",
  },

  number: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },

  check: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },
  finalDate: {
    marginTop: 6,
    fontSize: 12,
    color: "#000000",
    fontWeight: 700,
  },
  date: {
    marginTop: 6,
    fontSize: 12,
    color: "#8F9098",
  },
});
