import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Platform, Text, View } from "react-native";
import { COLOURS, styles } from "../styles/styles";
type AlertType =
  | "treatmentComplete"
  | "checkComplete"
  | "infestationDetected"
  | "checkLevels"
  | "checkIncomplete"
  | "treatmentUnavailable"
  | "treatmentFailed"
  | "connectionError"
  | "analysisFailed"
  | "recommendationAvailable"
  | "treatmentTemporarilyUnavailable"
  | "recommendationExpired"
  | "treatmentNotApplied";
const AlertBanner = ({
  alertType,
  closeAlert,
}: {
  alertType: AlertType;
  closeAlert?: () => void;
}) => {
  let level = "";
  let title = "";
  let text = "";

  switch (alertType) {
    case "treatmentComplete":
      level = "success";
      title = "Treatment Complete";
      text =
        "Treatment was successfully applied. Return next month to check mites again.";
      break;
    case "checkComplete":
      level = "success";
      title = "Mite Check Complete";
      text = "Your mite check is complete and logged.";
      break;

    case "infestationDetected":
      level = "warning";
      title = "Infestation Detected";
      text =
        "Mite levels exceed the recommended threshold. Review treatment options.";
      break;

    case "checkLevels":
      level = "warning";
      title = "Check Mite Levels";
      text =
        "It’s time for your monthly sticky board check to monitor hive health.";
      break;

    case "checkIncomplete":
      level = "warning";
      title = "Mite Check Incomplete";
      text =
        "Your mite check was not completed. Please try again to save your results.";
      break;
    case "treatmentTemporarilyUnavailable":
      level = "warning";
      title = "Treatment Temporarily Unavailable";
      text =
        "The current outdoor temperature is outside the safe range for this treatment. We’ll notify you when it’s safe to apply.";
      break;
    case "recommendationExpired":
      level = "warning";
      title = "Expired Treatment Recommendation";
      text =
        "Your treatment recommendation is out of date. Please recheck your infestation status.";
      break;
    case "treatmentUnavailable":
      level = "error";
      title = "Treatment Unavailable";
      text =
        "Treatment cannot be applied during this time of year. Please remove device from the hive.";
      break;

    case "treatmentFailed":
      level = "error";
      title = "Treatment Failed";
      text =
        "The device was unable to apply treatment. Please check the device and try again.";
      break;
    case "connectionError":
      level = "error";
      title = "Connection Error";
      text =
        "We couldn’t communicate with your device. Please reconnect and retry.";
      break;
    case "analysisFailed":
      level = "error";
      title = "Sticky Board Analysis Failed";
      text =
        "We couldn’t analyze your sticky board. Please take another image and try again.";
      break;
    case "recommendationAvailable":
      level = "general";
      title = "Treatment Recommendation Available";
      text = "Visit treatment recommendation to view and apply to your hive.";
      break;
    case "treatmentNotApplied":
      level = "general";
      title = "No Treatment Applied";
      text = "You've opted out of applying treatment.";
      break;

    default:
      level = "general";
      title = "No Treatment Applied";
      text = "You’ve opted out of applying treatment.";
  }
  const getIcon = (level: string) => {
    switch (level) {
      case "success":
        return (
          <MaterialCommunityIcons
            name="check-circle"
            size={24}
            color="#37c09e"
          />
        );
      case "warning":
        return (
          <MaterialCommunityIcons
            name="alert-circle"
            size={24}
            color="#f9b580"
          />
        );
      case "error":
        return (
          <MaterialCommunityIcons
            name="alert-circle"
            size={24}
            color="#ff626c"
          />
        );
      default:
        return (
          <MaterialCommunityIcons
            name="information-slab-circle"
            size={24}
            color="#006ffd"
          />
        );
    }
  };

  return (
    <View
      style={[
        level == "success"
          ? styles.success
          : level == "warning"
            ? styles.warning
            : level == "error"
              ? styles.error
              : styles.generalAlert,
        styles.alert,
        !closeAlert && { marginTop: 0 },
      ]}
    >
      {getIcon(level)}
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          style={{
            fontFamily: Platform.select({
              android: "Roboto_800ExtraBold",
            }),
            fontSize: 14,
            lineHeight: 16,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontSize: 14,
            lineHeight: 16,
          }}
        >
          {text}
        </Text>
      </View>
      {closeAlert && (
        <MaterialCommunityIcons
          name="close"
          color={COLOURS.darkGrey}
          size={12}
          onPress={closeAlert}
        />
      )}
    </View>
  );
};
export default AlertBanner;
