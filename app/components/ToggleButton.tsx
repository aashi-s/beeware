import { Text, TouchableOpacity } from "react-native";
import { styles } from "../styles/styles";

export default function ToggleButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.toggle, selected && styles.toggleSelected]}
    >
      <Text style={[styles.toggleText, selected && styles.toggleTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
