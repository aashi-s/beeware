import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { COLOURS, styles } from "../styles/styles";

const ActionButton = ({
  text,
  onPressFunction,
  unread,
  disabled,
}: {
  text: string;
  onPressFunction: () => void;
  unread?: boolean;
  disabled?: boolean;
}) => {
  const getIcon = (text: string) => {
    switch (text) {
      case "Check Infestation Status":
        return (
          <MaterialCommunityIcons
            name="scan-helper"
            size={26}
            color={disabled ? "#8b8b8b" : "#000"}
          />
        );
      case "Treatment Recommendation":
        return (
          <MaterialCommunityIcons
            name="sprinkler-fire"
            size={26}
            color={disabled ? "#8b8b8b" : "#000"}
          />
        );
      case "Treatment Management":
        return (
          <MaterialCommunityIcons
            name="content-copy"
            size={26}
            color={disabled ? "#8b8b8b" : "#000"}
          />
        );
      case "Resources":
        return (
          <MaterialCommunityIcons
            name="exit-to-app"
            size={26}
            color={disabled ? "#8b8b8b" : "#000"}
          />
        );
      default:
        return (
          <MaterialCommunityIcons
            name="lock-reset"
            size={26}
            color={disabled ? "#8b8b8b" : "#000"}
          />
        );
    }
  };

  return (
    <TouchableOpacity
      style={{
        gap: 5,
        paddingHorizontal: 15,
        paddingBlock: 24,
        borderRadius: 12,
        justifyContent: "flex-end",
        backgroundColor: disabled ? "#e0e0e0" : "white",
        boxShadow: "1px 4px 4px 0px rgba(0, 0, 0, 0.05)",
      }}
      onPress={onPressFunction}
      disabled={disabled}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {getIcon(text)}
        <Text style={[styles.buttonText, disabled && { color: "#8b8b8b" }]}>
          {text}
        </Text>
      </View>
      {/* unread */}
      {unread && (
        <View
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: COLOURS.colour3,
          }}
        />
      )}
    </TouchableOpacity>
  );
};
export default ActionButton;
