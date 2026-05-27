import Checkbox from "expo-checkbox";
import { Pressable, StyleSheet, Text } from "react-native";
import { COLOURS } from "../styles/styles";

export default function ConfirmCheckbox({
  approvedTreatment,
  setApprovedTreatment,
  disabled,
  foamPads,
}: {
  approvedTreatment: boolean;
  setApprovedTreatment: (newVal: boolean) => void;
  disabled?: boolean;
  foamPads: boolean;
}) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => setApprovedTreatment(!approvedTreatment)}
      disabled={disabled}
    >
      <Checkbox
        value={approvedTreatment}
        onValueChange={setApprovedTreatment}
        color={approvedTreatment ? COLOURS.colour3 : "#c3c5ca"}
        style={styles.checkbox}
        disabled={disabled}
      />
      <Text style={styles.text}>
        I confirm that I have{" "}
        <Text style={{ fontWeight: 700 }}>
          {foamPads ? "placed" : "removed"} foam pads
        </Text>{" "}
        in my hive. This action will apply treatment cycle automatically.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    borderRadius: 6, // rounded square like your screenshot
    borderColor: "#c3c5ca",
  },
  text: {
    flex: 1,
    color: "#7E7E7E",
    fontSize: 14,
    marginTop: 5,
  },
});
