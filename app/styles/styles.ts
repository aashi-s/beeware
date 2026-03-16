import { Dimensions, Platform, StyleSheet } from "react-native";
const { height } = Dimensions.get("window");

export const COLOURS = {
  light: "#FAFAFA",
  textLight: "#E6E2DD",
  textDark: "#32302D",
  tertiary: "#FFD56A",
  colour3: "#DE721B",
  colour4: "#1F1600",
  darkGrey: "#655F5F",
};
// TODO: split this by page
export const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 24,
    fontFamily: Platform.select({ android: "Roboto_400Regular" }),
    fontSize: 14,
    lineHeight: 16,
    backgroundColor: COLOURS.light,
    color: COLOURS.textDark,
  },
  h1: {
    fontFamily: Platform.select({ android: "Roboto_800ExtraBold" }),
    fontSize: 24,
  },
  h2: {
    fontFamily: Platform.select({ android: "Roboto_800ExtraBold" }),
    fontSize: 16,
  },
  subtitle: {
    fontFamily: Platform.select({ android: "Roboto_400Regular" }),
    fontSize: 14,
    lineHeight: 16,
    color: COLOURS.darkGrey,
  },
  buttonText: {
    fontFamily: Platform.select({ android: "Roboto_600SemiBold" }),
    fontSize: 14,
  },
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  modal: { justifyContent: "flex-end", margin: 0 },
  sheet: {
    height: height * 0.91,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    elevation: 0,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#4caf50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 15,
    color: "white",
  },
  success: { backgroundColor: "#E7F4E8" },
  warning: { backgroundColor: "#FFF4E4" },
  error: { backgroundColor: "#FFE2E5" },
  generalAlert: { backgroundColor: "#EAF2FF" },
  alert: {
    padding: 16,
    flexDirection: "row",
    gap: 16,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  overviewInfo: {
    borderRadius: 12,
    gap: 5,
    paddingHorizontal: 15,
    paddingBlock: 12,
    width: "48%",
  },
  modalButton: {
    borderRadius: 12,
    backgroundColor: "#DE721B",
    color: "white",
    paddingHorizontal: 10,
    paddingBlock: 7,
  },

  preview: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  placeholder: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 30,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#888",
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f2f2f2",
  },
  disabledButton: {
    backgroundColor: "#E0E0E0",
    color: "#8B8B8B",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginVertical: 10,
    marginTop: 84,
  },
  historyIcon: {
    borderRadius: 6,
    backgroundColor: "#FFF7E6",
    width: 33,
    height: 36,
    paddingHorizontal: 6,
    paddingBlock: 7.5,
    alignContent: "center",
    flexDirection: "row",
    alignSelf: "center",
  },
  pageTitle: {
    fontSize: 20,
    marginTop: 20,
    marginBottom: 9,
  },
  monthTitle: {
    fontWeight: 800,
    marginBlock: 20,
    fontSize: 16,
    paddingLeft: 10,
  },
  timeTitle: { color: "#8F9098" },

  description: {
    color: "#666",
    marginBlock: 24,
    lineHeight: 20,
  },

  divider: {
    height: 1,
    backgroundColor: "#e2e2e2",
    marginVertical: 8,
  },

  row: {
    marginBottom: 26,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },

  question: {
    color: COLOURS.darkGrey,
    width: "50%",
  },

  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLOURS.colour3,
    alignItems: "center",
    justifyContent: "center",
  },

  circleText: {
    fontSize: 22,
    color: COLOURS.colour3,
  },

  counterBox: {
    borderWidth: 2,
    borderColor: COLOURS.colour3,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },

  counterText: {
    fontSize: 20,
    color: COLOURS.colour3,
    fontWeight: "600",
  },

  disabled: {
    borderColor: "#E5E7EB",
    backgroundColor: "#F0F0F0",
  },

  toggleRow: {
    flexDirection: "row",
    gap: 12,
  },

  toggle: {
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 12,
    paddingHorizontal: 25,
    justifyContent: "center",
  },

  toggleSelected: {
    backgroundColor: COLOURS.colour3,
    borderColor: COLOURS.colour3,
  },

  toggleText: {
    color: COLOURS.darkGrey,
    fontWeight: "500",
  },

  toggleTextSelected: {
    color: "#fff",
  },

  bottomButtons: {
    flexDirection: "row",
    marginTop: "auto",
    gap: 16,
  },

  backButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 14,
  },

  backText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },

  primaryButton: {
    flex: 1.5,
    backgroundColor: COLOURS.colour3,
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 14,
  },

  primaryText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});
