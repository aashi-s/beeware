import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "react-native-modal";

// Placeholder SVG components
import { userStorage } from "@/index";
import { COLOURS } from "../styles/styles";

const Settings = () => {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const handleLogout = () => {
    userStorage.set("reset", JSON.stringify({ value: true }));
    router.replace("/(onboarding)");
  };
  return (
    <ScrollView style={styles.page}>
      {/* Header */}
      <Text style={styles.header}>Settings</Text>

      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>U</Text>
        </View>
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.userName}>User</Text>
          <Text style={styles.userEmail}>user@beekeeper.com</Text>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={"#FFFFFF"}
          style={{ marginLeft: 100 }}
        />
      </View>

      {/* Notifications */}
      <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View style={styles.iconBackground}>
            <MaterialCommunityIcons
              name="bell-outline"
              size={20}
              color={COLOURS.colour3}
            />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Push Notifications</Text>
            <Text style={styles.cardSubtitle}>
              Mite check reminders, treatment alerts
            </Text>
          </View>
        </View>
        <Switch
          value={pushEnabled}
          onValueChange={setPushEnabled}
          trackColor={{ false: "#ccc", true: "#E27D3D" }}
          thumbColor="#fff"
        />
      </View>

      {/* Support */}
      <Text style={styles.sectionTitle}>SUPPORT</Text>
      <TouchableOpacity style={styles.card} disabled>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.iconBackground}>
            <MaterialCommunityIcons
              name="information-variant-circle-outline"
              size={20}
              color={COLOURS.colour3}
            />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Device Status</Text>
            <Text style={styles.cardSubtitle}>BeeWare-4A2F · Connected</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => router.replace("/(onboarding)")}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={styles.iconBackground}>
            <MaterialCommunityIcons
              name="help-circle-outline"
              size={20}
              color={COLOURS.colour3}
            />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Help and Support</Text>
            <Text style={styles.cardSubtitle}>
              View onboarding instructions
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={"#C5C6CC"}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.card}
        onPress={() => setTermsModalVisible(true)}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.iconBackground}>
            <MaterialCommunityIcons
              name="note-text-outline"
              size={20}
              color={COLOURS.colour3}
            />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Privacy</Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={"#C5C6CC"}
        />
      </TouchableOpacity>

      {/* Developer */}
      <Text style={styles.sectionTitle}>DEVELOPER</Text>
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          userStorage.set("reset", JSON.stringify({ value: true }))
        }
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.iconBackground}>
            <MaterialCommunityIcons
              name="test-tube"
              size={20}
              color={COLOURS.colour3}
            />
          </View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.cardTitle}>Testing Mode</Text>
            <Text style={styles.cardSubtitle}>
              Reset Application for Symposium
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={"#C5C6CC"}
        />
      </TouchableOpacity>
      {/* Restart Device */}
      <TouchableOpacity style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View>
            <Text style={styles.restartTitle}>Restart Device</Text>
            <Text style={styles.cardSubtitle}>
              Restart device to reconnect to mobile app
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={"#C5C6CC"}
        />
      </TouchableOpacity>
      {/* Log Out Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <MaterialCommunityIcons
          name="logout"
          size={20}
          color={COLOURS.colour3}
        />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Terms Modal */}
      <Modal
        isVisible={termsModalVisible}
        onBackdropPress={() => setTermsModalVisible(false)}
        onBackButtonPress={() => setTermsModalVisible(false)}
        onSwipeComplete={() => setTermsModalVisible(false)}
        swipeDirection={"down"}
        swipeThreshold={100}
        style={styles.modal}
        animationIn={"slideInUp"}
        animationOut={"slideOutDown"}
        backdropOpacity={0.4}
        backdropTransitionOutTiming={0}
        hideModalContentWhileAnimating={true}
        propagateSwipe
      >
        <View style={styles.sheet}>
          {/* drag handle */}
          <View style={styles.handle} />
          {/* header */}
          <Text style={styles.title}>Privacy</Text>
          <Text style={{ fontWeight: 700, fontSize: 16, marginTop: 10 }}>
            Privacy Policy — BeeWare v1.0
          </Text>
          <Text style={{ color: "#71727A", fontSize: 16 }}>
            We collect only the data needed to provide hive health monitoring.
            This includes hive sensor readings, sticky board photos, and your
            account information.
          </Text>
          <Text style={{ fontWeight: 700, fontSize: 16, marginTop: 10 }}>
            What we collect
          </Text>
          <Text style={{ color: "#71727A", fontSize: 16 }}>
            Name and email, hive location (city), device telemetry (temperature,
            humidity, battery), sticky board images, and mite count history.
          </Text>
          <Text style={{ fontWeight: 700, fontSize: 16, marginTop: 10 }}>
            What we never do
          </Text>
          <Text style={{ color: "#71727A", fontSize: 16 }}>
            We never sell your data, never share it with advertisers, and never
            run treatments without your explicit approval.
          </Text>
          <Text style={{ fontWeight: 700, fontSize: 16, marginTop: 10 }}>
            Deletion
          </Text>
          <Text style={{ color: "#71727A", fontSize: 16 }}>
            Contact support@beeware.app to request full data deletion. We'll
            confirm within 48 hours.
          </Text>
        </View>
      </Modal>
    </ScrollView>
  );
};
const { height } = Dimensions.get("window");
const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 100,
    paddingHorizontal: 24,
    fontSize: 14,
    lineHeight: 16,
    backgroundColor: COLOURS.light,
    color: COLOURS.textDark,
  },
  header: { fontSize: 28, fontWeight: "700", marginBottom: 16, marginTop: 20 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFDD77",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontWeight: "700", fontSize: 18, color: "#E27D3D" },
  userName: { fontWeight: "700", fontSize: 18 },
  userEmail: { color: "#7D7D7D", marginTop: 2 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7D7D7D",
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconBackground: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF2E0",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontWeight: "700", fontSize: 16 },
  cardSubtitle: { fontSize: 12, color: "#7D7D7D", marginTop: 2 },
  restartTitle: { fontWeight: "700", fontSize: 16, color: COLOURS.colour3 },
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
  logoutButton: {
    marginTop: 24,
    backgroundColor: "#FFF4E0",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  logoutText: {
    color: "#E27D3D",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default Settings;
