import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  LogBox,
  PermissionsAndroid,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import base64 from "react-native-base64";
import { Device as BLEDevice, BleManager } from "react-native-ble-plx";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import Modal from "react-native-modal";
import uuid from "react-native-uuid";
import ScanInfoOne from "../../assets/scanInfo1.svg";
import ScanInfoTwo from "../../assets/scanInfo2.svg";
import ScanInfoThree from "../../assets/scanInfo3.svg";
import TreatInfo from "../../assets/treatInfo.svg";
import { notificationStorage, userStorage } from "../../index";
import ActionButton from "../components/ActionButton";
import AlertBanner from "../components/AlertBanner";
import CircularLoader from "../components/CircularLoader";
import CircularProgress from "../components/CircularProgress";
import ConfirmCheckbox from "../components/ConfirmCheckbox";
import { COLOURS, styles } from "../styles/styles";

LogBox.ignoreLogs(["new NativeEventEmitter"]); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: false,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// TYPES
type ApprovalType = "pending" | "approved" | "declined";
type ApplicationType = "pending" | "success" | "error" | "null";
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
export default function Index() {
  // STATES
  const [lastUpdated, setLastUpdated] = useState(
    new Date()
      .toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", ""),
  );
  const [lastCheckDate, setLastCheckDate] = useState<Date>(
    new Date("2026-01-26"),
  );

  const [approvedTreatment, setApprovedTreatment] = useState(false);
  const [latestMiteCount, setLatestMiteCount] = useState(13);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [nextCheck, setNextCheck] = useState(-1);
  const [lastNotInfested, setlastNotInfested] = useState(32);
  const [numDays, setNumDays] = useState("1");
  const [treatmentStep, setTreatmentStep] = useState(0);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [imageStatus, setImageStatus] = useState("");
  const [isModalVisible, setModalVisible] = useState(false);
  const [treatmentModalVisible, setTreatmentModalVisible] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState("");
  const [sessionDetails, setSessionDetails] = useState<{
    userInputs?: string;
    miteCount?: number;
    infestation?: boolean;
    temperature?: string;
    treatment?: string;
    approval?: ApprovalType;
    delay?: boolean;
    applied?: ApplicationType;
    date: string;
    updatedAt?: string;
  }>({
    userInputs: undefined,
    miteCount: undefined,
    infestation: undefined,
    temperature: undefined,
    treatment: undefined,
    approval: undefined,
    delay: undefined,
    applied: undefined,
    date: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [channels, setChannels] = useState<Notifications.NotificationChannel[]>(
    [],
  );
  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >(undefined);
  const [sessionId, setSessionId] = useState("");
  const [isConnected, setIsConnected] = useState(false); //Is a device connected?
  const [isAnalyzing, setIsAnalyzing] = useState("Start Analysis"); //Is the analysis process ongoing?
  const [treatment, setTreatment] = useState<string>("Formic Acid"); //Treatment value returned
  const [treatmentUnread, setTreatmentUnread] = useState<boolean>(false);
  const [infestation, setInfestation] = useState<boolean | undefined>(
    undefined,
  ); //Infestation boolean value returned
  const [connectedDevice, setConnectedDevice] = useState<BLEDevice>(); //What device is connected?
  const [temperature, setTemperature] = useState("20");
  const [treatmentOnMicrocontroller, setTreatmentOnMicrocontroller] = useState<
    string | null
  >(null); // treatment value that microcontroller has
  const [encodedImage, setEncodedImage] = useState("");
  const [imageURI, setImageURI] = useState<string | undefined>(undefined);

  // CONSTANTS
  const BACKEND_URL = "https://loriann-imbricative-transfixedly.ngrok-free.dev";
  const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const TEMPERATURE_UUID = "6d68efe5-04b6-4a85-abc4-c2670b7bf7fd";
  const TREATMENT_UUID = "f27b53ad-c63d-49a0-8c0f-9f297e6cc520";
  const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND-NOTIFICATION-TASK";
  // const CONSOLE_UUID = "";
  const THREE_MONTHS = 3 * 30 * 24 * 60 * 60; // in seconds

  const BLTManager = new BleManager();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const slideAnim = useRef(new Animated.Value(0)).current;

  async function registerForPushNotificationsAsync() {
    let token;
    // we're only running this app on android phones, but this notification channel is only for android
    await Notifications.setNotificationChannelAsync(
      "miteDetectionNotificationChannel",
      {
        name: "BeeWare Channel",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [250, 0, 250, 0],
      },
    );

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    // Ensure finalStatus has permission granted before proceeding
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Failed to get push token for push notification");
      return;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;
      if (!projectId) {
        throw new Error("Project ID not found");
      }
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
    } catch (e) {
      token = `${e}`;
    }

    return token;
  }
  useEffect(() => {
    setLastUpdated(
      new Date()
        .toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .replace(",", ""),
    );
  }, [lastNotInfested, nextCheck]);

  useEffect(() => {
    // db
    const lastSession = userStorage.getString("latestSession");
    if (lastSession) {
      const lastSessionData = userStorage.getString(lastSession);
      const parsed = lastSessionData ? JSON.parse(lastSessionData) : {};
      setLatestMiteCount(parsed.miteCount);
      if (parsed.treatment_recommendation) {
        setTreatment(parsed.treatment);
      }
      if (parsed.date) {
        const today = new Date();
        const lastDate = new Date(parsed.date);
        setLastCheckDate(lastDate);

        // difference in days
        const diffTime = today.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        setNextCheck(30 - diffDays);
        if (diffDays >= 30) {
          setAlerts((alerts) => [...alerts, "checkLevels"]);
        }
      }
    }

    // notifs
    registerForPushNotificationsAsync().then(
      (token) => token && setExpoPushToken(token),
    );
    Notifications.getNotificationChannelsAsync().then((value) =>
      setChannels(value ?? []),
    );
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      },
    );
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });
    registerBackgroundNotificationTask();
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  async function schedulePushNotification(
    title: string,
    body: string,
    seconds?: number,
  ) {
    const content = {
      title,
      body,
    };
    const sendDate = new Date();
    sendDate.setSeconds(sendDate.getSeconds() + (seconds || 30));

    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds || 30,
      },
    }).then((notificationId) => {
      const notificationDetails = {
        sessionId: sessionId,
        status: "scheduled",
        sendDate: sendDate.toISOString(),
        title: content.title,
        body: content.body,
        updatedAt: new Date().toISOString(),
      };
      notificationStorage.set(
        notificationId,
        JSON.stringify(notificationDetails),
      );
    });
  }

  async function openAppNotificationSettings() {
    await Linking.openSettings();
  }

  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, (data) => {
    console.log("Notification received in background!", data);
    return Promise.resolve();
  });

  async function registerBackgroundNotificationTask() {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  }

  // Scans availbale BLT Devices and then call connectDevice
  async function scanDevices() {
    PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    ]).then((answer) => {
      if (answer["android.permission.POST_NOTIFICATIONS"] == "denied") {
        Alert.alert(
          "Notifications Disabled",
          "Please enable notifications in Settings",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: openAppNotificationSettings },
          ],
        );
      }
      console.log("scanning");

      BLTManager.startDeviceScan(null, null, (error, scannedDevice) => {
        if (error) {
          console.warn(error);
        }

        if (scannedDevice && scannedDevice.name == "BLETest") {
          BLTManager.stopDeviceScan();
          connectDevice(scannedDevice);
        }
      });

      // stop scanning devices after 5 seconds
      setTimeout(() => {
        BLTManager.stopDeviceScan();
      }, 5000);
    });
  }

  // handle the device disconnection (poorly)
  // TODO: fix.
  async function disconnectDevice() {
    console.log("Disconnecting start");

    if (connectedDevice != null) {
      const isDeviceConnected = await connectedDevice.isConnected();
      if (isDeviceConnected) {
        BLTManager.cancelTransaction("temperaturetransaction");
        // BLTManager.cancelTransaction("consoletransaction");
        BLTManager.cancelTransaction("nightmodetransaction");

        BLTManager.cancelDeviceConnection(connectedDevice.id).then(() =>
          console.log("DC completed"),
        );
      }

      const connectionStatus = await connectedDevice.isConnected();
      if (!connectionStatus) {
        setIsConnected(false);
      }
    }
  }

  //Function to send data to ESP32
  async function sendTreatment(value: string) {
    if (connectedDevice == null) {
      return;
    }
    // writes to microcontroller, it gets a characteristic in return from which it prints the value
    // it doesnt set the treatment (what is shown on the frontend) just yet though
    BLTManager.writeCharacteristicWithResponseForDevice(
      connectedDevice?.id,
      SERVICE_UUID,
      TREATMENT_UUID,
      base64.encode(value),
    ).then((characteristic) => {
      if (characteristic.value)
        console.log(
          "Treatment written to microcontroller: ",
          base64.decode(characteristic.value),
        );
    });
  }
  //Connect the device and start monitoring characteristics
  async function connectDevice(device: BLEDevice) {
    console.log("connecting to Device:", device.name);

    device
      .connect()
      .then((device) => {
        setConnectedDevice(device);
        setIsConnected(true);
        return device.discoverAllServicesAndCharacteristics();
      })
      .then((device) => {
        //  Set what to do when DC is detected
        BLTManager.onDeviceDisconnected(device.id, (error, device) => {
          console.log("Device DC");
          setIsConnected(false);
        });

        //Read inital values

        // Temperature
        device
          .readCharacteristicForService(SERVICE_UUID, TEMPERATURE_UUID)
          .then((valenc) => {
            if (valenc?.value) {
              setTemperature(base64.decode(valenc?.value));
            }
          });

        //Treatment
        device
          .readCharacteristicForService(SERVICE_UUID, TREATMENT_UUID)
          .then((valenc) => {
            if (valenc?.value)
              setTreatmentOnMicrocontroller(base64.decode(valenc?.value));
          });

        //monitor values and tell what to do when receiving an update
        // these stay running in the background

        // Temperature
        device.monitorCharacteristicForService(
          SERVICE_UUID,
          TEMPERATURE_UUID,
          (error, characteristic) => {
            if (characteristic?.value != null) {
              setTemperature(base64.decode(characteristic?.value));
              console.log(
                "Temperature update received: ",
                base64.decode(characteristic?.value),
              );
            }
          },
          "temperaturetransaction",
        );

        //Treatment
        // it gets updates when this characteristic is written to
        device.monitorCharacteristicForService(
          SERVICE_UUID,
          TREATMENT_UUID,
          (error, characteristic) => {
            if (characteristic?.value != null) {
              // setTreatment(StringToBool(base64.decode(characteristic?.value)));
              setTreatmentOnMicrocontroller(
                base64.decode(characteristic?.value),
              );
              // now that its received an update of what the microcontroller sees, it will update
              console.log(
                "Treatment update received: ",
                base64.decode(characteristic?.value),
              );
            }
          },
          "treatmenttransaction",
        );

        // Console
        // device.monitorCharacteristicForService(
        //   SERVICE_UUID,
        //   CONSOLE_UUID,
        //   (error, characteristic) => {
        //     if (characteristic?.value != null) {
        //       console.log(
        //         "Console update received: ",
        //         base64.decode(characteristic?.value)
        //       );
        //     }
        //   },
        //   "consoletransaction"
        // );

        console.log("Connection established");
      });
  }

  const showSuccessOverlay = () => {
    setOverlayVisible(true);

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setOverlayVisible(false);
      handleStartAnalysis();
      getNextStep(6);
    });
  };

  const closeUploadModal = () => {
    setModalVisible(false);
    setTreatmentStep(0);
    slideAnim.setValue(0);
    setImageStatus("");
    setIsAnalyzing("Start Analysis");
  };

  const closeTreatmentModal = () => {
    setTreatmentModalVisible(false);
    slideAnim.setValue(0);
  };

  const getNextStep = (newStep: number) => {
    if (treatmentStep === newStep) return;

    const direction = newStep > treatmentStep ? 1 : -1;

    Animated.timing(slideAnim, {
      toValue: -direction * width,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setTreatmentStep(newStep);
      slideAnim.setValue(direction * width);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const renderStep = (step: number) => {
    switch (step) {
      case 0:
        return (
          <View
            style={{
              justifyContent: "space-between",
              flexDirection: "column",
              gap: 24,

              height: "100%",
            }}
          >
            <View style={{ gap: 24 }}>
              <Text style={styles.subtitle}>
                This page shows current hive infestation status and when your
                next mite check is required.
              </Text>
              <View
                style={{
                  borderRadius: 12,
                  gap: 8,
                  backgroundColor: "#FFEEC3",
                  padding: 20,
                  marginBlock: 8,
                }}
              >
                <View style={{ flexDirection: "row" }}>
                  <MaterialCommunityIcons name="calendar" size={22} />
                  <Text style={{ marginHorizontal: 10, fontWeight: 700 }}>
                    Next Mite Check
                  </Text>
                  <Text
                    style={{
                      color: nextCheck < 0 ? "#FF0014" : "black",
                      fontWeight: 700,
                      marginLeft: 10,
                    }}
                  >
                    {Math.abs(nextCheck)}
                  </Text>
                  <Text
                    style={{
                      color: nextCheck < 0 ? "#FF0014" : "black",
                      fontWeight: 700,
                    }}
                  >
                    {nextCheck < 0
                      ? `${nextCheck == -1 ? " day" : " days"} overdue`
                      : nextCheck == 1
                        ? " day"
                        : " days"}
                  </Text>
                </View>
                <Text style={styles.subtitle}>
                  {nextCheck > 0
                    ? `Check your hive in ${nextCheck} days.`
                    : "It's time to check your hive's mite levels. Scan your sticky board now."}
                </Text>
              </View>
              <Text>From Last Mite Check:</Text>
              <View
                style={{
                  flexDirection: "row",
                  marginBottom: 50,
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <CircularProgress
                  size={80}
                  strokeWidth={10}
                  progress={75} // 75% filled
                  text={
                    latestMiteCount > 12 ? "> 12" : latestMiteCount.toString()
                  }
                  color={latestMiteCount > 9 ? "#FF0014" : "#3AC0A0"}
                  backgroundColor="#F0F0F0"
                  duration={1500} // animation duration
                />

                <View>
                  <View style={{ flexDirection: "row", marginBottom: 8 }}>
                    <Text style={{ fontWeight: 700 }}>Status: </Text>
                    <Text
                      style={{
                        color: `${latestMiteCount > 9 ? "#FF0014" : "#3AC0A0"}`,
                        fontWeight: 700,
                      }}
                    >
                      {latestMiteCount > 9 ? "Infested" : "Not Infested"}
                    </Text>
                  </View>
                  <View style={{ maxWidth: "80%" }}>
                    <Text style={styles.subtitle}>
                      {latestMiteCount > 9
                        ? "Mite levels are above the threshold, treatment is advised."
                        : "Mite levels are below the threshold, no action required."}
                    </Text>
                    <Text style={{ color: "#949494" }}>
                      {`As of ${lastCheckDate.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })} sticky board`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            {/* Buttons */}
            <View
              style={{
                flexDirection: "row",
                gap: 12,
                justifyContent: "space-between",
                marginBottom: 76,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { width: "47%", alignItems: "center" },
                ]}
                onPress={() => getNextStep(1)}
              >
                <Text
                  style={[
                    styles.modalButton,
                    styles.buttonText,
                    { backgroundColor: "transparent" },
                  ]}
                >
                  Scan Sticky Board
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  nextCheck < 0 && styles.disabledButton,
                  { width: "47%", alignItems: "center" },
                ]}
                onPress={() => {
                  closeUploadModal();
                  setTreatmentModalVisible(true);
                  setTreatmentUnread(false);
                  setAlerts((prev) =>
                    prev.filter((i) => i != "recommendationAvailable"),
                  );
                }}
                disabled={nextCheck < 0}
              >
                <Text
                  style={[
                    styles.modalButton,
                    styles.buttonText,
                    nextCheck < 0 && styles.disabledButton,
                    { backgroundColor: "transparent" },
                  ]}
                >
                  View Treatment
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 1:
        return (
          <View
            style={{
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            <View style={{ gap: 24 }}>
              <Text
                style={{
                  borderTopColor: "#D8EAE9",
                  borderTopWidth: 1,
                  borderBottomColor: "#D8EAE9",
                  borderBottomWidth: 1,
                  paddingBlock: 10,
                }}
              >
                Before you start
              </Text>
              <Text style={{ color: COLOURS.darkGrey }}>
                When you’re ready, go to your hive to start the mite check.
              </Text>
              <ScanInfoOne style={{ alignSelf: "center" }} />
              {/* <Image
                source={require("../../assets/scanInfo1.png")}
                style={{ alignSelf: "center" }}
              /> */}
              <Text style={{ color: COLOURS.darkGrey }}>
                For best results, complete this check during daylight.
              </Text>
            </View>
            <View
              style={{
                marginBottom: 34,
                gap: 24,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      display: "flex",
                      width: "47%",
                      alignItems: "center",
                      backgroundColor: COLOURS.darkGrey,
                    },
                  ]}
                  onPress={() => getNextStep(0)}
                >
                  <Text
                    style={[
                      styles.modalButton,
                      styles.buttonText,
                      { backgroundColor: "transparent" },
                    ]}
                  >
                    Back
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      display: "flex",
                      width: "47%",
                      alignItems: "center",
                    },
                  ]}
                  onPress={() => getNextStep(2)}
                >
                  <Text
                    style={[
                      styles.modalButton,
                      styles.buttonText,
                      { backgroundColor: "transparent" },
                    ]}
                  >
                    Continue
                  </Text>
                </TouchableOpacity>
              </View>
              <Text
                onPress={() => getNextStep(4)}
                style={{ color: COLOURS.darkGrey }}
              >
                Skip Tutorial
              </Text>
            </View>
          </View>
        );
      case 2:
        return (
          <View
            style={{
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            <View style={{ gap: 24 }}>
              <Text
                style={{
                  borderTopColor: "#D8EAE9",
                  borderTopWidth: 1,
                  borderBottomColor: "#D8EAE9",
                  borderBottomWidth: 1,
                  paddingBlock: 10,
                  color: COLOURS.darkGrey,
                }}
              >
                Instructions
              </Text>
              <Text style={{ color: COLOURS.darkGrey }}>
                Slide out the bottom board holding the sticky board, keeping it
                flat and steady.
              </Text>
              {/* <Image
                source={require("../../assets/scanInfo2.png")}
                style={{ alignSelf: "center" }}
              /> */}
              <ScanInfoTwo style={{ alignSelf: "center" }} />
              <Text style={{ color: COLOURS.darkGrey }}>
                Disturbing the surface may affect mite counts.
              </Text>
            </View>
            <View
              style={{
                marginBottom: 76,
                flexDirection: "row",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                  },
                ]}
                onPress={() => getNextStep(3)}
              >
                <Text
                  style={[
                    styles.modalButton,
                    styles.buttonText,
                    { backgroundColor: "transparent" },
                  ]}
                >
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 3:
        return (
          <View
            style={{
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            <View style={{ gap: 24 }}>
              <Text
                style={{
                  borderTopColor: "#D8EAE9",
                  borderTopWidth: 1,
                  borderBottomColor: "#D8EAE9",
                  borderBottomWidth: 1,
                  paddingBlock: 10,
                  color: COLOURS.darkGrey,
                }}
              >
                Instructions
              </Text>
              <Text style={{ color: COLOURS.darkGrey }}>
                Take a photo of your hive’s sticky board.
              </Text>
              {/* <Image
                source={require("../../assets/scanInfo3.png")}
                style={{ alignSelf: "center" }}
              /> */}
              <ScanInfoThree style={{ alignSelf: "center" }} />
              <Text style={{ color: COLOURS.darkGrey }}>
                Ensure the board is fully visible, well lit, and free of glare
                or obstructions.
              </Text>
            </View>
            <View
              style={{
                marginBottom: 76,
                flexDirection: "row",
                justifyContent: "center",
                width: "100%",
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                  },
                ]}
                onPress={() => getNextStep(4)}
              >
                <Text
                  style={[
                    styles.modalButton,
                    styles.buttonText,
                    { backgroundColor: "transparent" },
                  ]}
                >
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 4:
        return (
          <View
            style={{
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            <View style={{ gap: 24 }}>
              <Text
                style={{
                  borderTopColor: "#D8EAE9",
                  borderTopWidth: 1,
                  borderBottomColor: "#D8EAE9",
                  borderBottomWidth: 1,
                  paddingBlock: 10,
                  color: COLOURS.darkGrey,
                }}
              >
                Upload an image of your sticky board
              </Text>

              <MaterialCommunityIcons
                name="upload"
                size={110}
                color="#000000"
                style={{
                  alignSelf: "center",
                  marginTop: 100,
                  marginBottom: 40,
                }}
              />
              <Text style={{ color: COLOURS.darkGrey, alignSelf: "center" }}>
                Ensure the board is fully visible, clear, and well lit.
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
                marginBottom: 76,
                gap: 24,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    display: "flex",
                    width: "47%",
                    alignItems: "center",
                  },
                ]}
                onPress={handleTakePhoto}
              >
                <Text
                  style={[
                    styles.modalButton,
                    styles.buttonText,
                    { backgroundColor: "transparent" },
                  ]}
                >
                  Open Camera
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    display: "flex",
                    width: "47%",
                    alignItems: "center",
                  },
                ]}
                onPress={handleUploadImage}
              >
                <Text
                  style={[
                    styles.modalButton,
                    styles.buttonText,
                    { backgroundColor: "transparent" },
                  ]}
                >
                  Select from Photos
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 5:
        return (
          <View
            style={{
              flex: 1,
            }}
          >
            <View
              style={{
                justifyContent: "space-between",
                flex: 1,
              }}
            >
              {/* Top content */}
              <View style={{ gap: 24 }}>
                <Text
                  style={{
                    borderTopColor: "#D8EAE9",
                    borderTopWidth: 1,
                    borderBottomColor: "#D8EAE9",
                    borderBottomWidth: 1,
                    paddingVertical: 10,
                    color: COLOURS.darkGrey,
                  }}
                >
                  Upload an image of your sticky board
                </Text>

                <Image
                  source={{ uri: imageURI }}
                  style={{
                    width: 292,
                    height: 332,
                    alignSelf: "center",
                    borderRadius: 12,
                    borderColor: "#C5C6CC",
                    borderWidth: 5,
                  }}
                />
              </View>

              {/* Buttons */}
              <View
                style={{
                  marginBottom: 76,
                  gap: 24,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  width: "100%",
                  paddingRight: 4,
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      display: "flex",
                      width: "47%",
                      alignItems: "center",
                      backgroundColor: COLOURS.darkGrey,
                    },
                  ]}
                  onPress={() => getNextStep(4)}
                >
                  <Text
                    style={[
                      styles.modalButton,
                      styles.buttonText,
                      { backgroundColor: "transparent" },
                    ]}
                  >
                    Back
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      display: "flex",
                      width: "47%",
                      alignItems: "center",
                    },
                  ]}
                  onPress={showSuccessOverlay}
                >
                  <Text
                    style={[
                      styles.modalButton,
                      styles.buttonText,
                      { backgroundColor: "transparent" },
                    ]}
                  >
                    Confirm
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      case 6:
        return (
          <View
            style={{
              justifyContent: "space-between",
              flex: 1,
            }}
          >
            <View style={{ gap: 24 }}>
              <Text
                style={{
                  borderTopColor: "#D8EAE9",
                  borderTopWidth: 1,
                  borderBottomColor: "#D8EAE9",
                  borderBottomWidth: 1,
                  paddingBlock: 10,
                  color: COLOURS.darkGrey,
                }}
              >
                Checking sticky board
              </Text>
              <View
                style={{
                  // flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  marginTop: 70,
                  height: "auto",
                }}
              >
                <CircularLoader
                  duration={3000}
                  isLoading={isAnalyzing != "Analysis Completed"}
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%",
                marginBottom: 76,
                gap: 24,
              }}
            >
              {isAnalyzing == "Analysis Completed" && (
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                    },
                  ]}
                  onPress={() => {
                    setAlerts((alerts) => [
                      ...alerts.filter((i) => i != "checkLevels"),
                      "checkComplete",
                    ]);
                    getNextStep(0);
                  }}
                >
                  <Text
                    style={[
                      styles.modalButton,
                      styles.buttonText,
                      { backgroundColor: "transparent" },
                    ]}
                  >
                    View Infestation Status
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const renderTreatment = () => {
    switch (treatment) {
      case "":
        return <></>;
      case "None":
        return (
          <View style={{ gap: 24 }}>
            <Text
              style={{
                borderTopColor: "#D8EAE9",
                borderTopWidth: 1,
                borderBottomColor: "#D8EAE9",
                borderBottomWidth: 1,
                paddingBlock: 10,
                fontWeight: 600,
              }}
            >
              Treatment{" "}
              <Text style={{ color: COLOURS.colour3, fontWeight: "bold" }}>
                Not Recommended
              </Text>
            </Text>
            <View style={{ justifyContent: "space-between", height: "80%" }}>
              <Text>
                Based on your mite check from{" "}
                {lastCheckDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                })}
                , no infestation is detected and treatment is not necessary.
              </Text>
              {/* <Image
                source={require("../../assets/treatInfo.png")}
                style={{ alignSelf: "center" }}
              /> */}
              <TreatInfo style={{ alignSelf: "center" }} />
              <View
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 24,
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      backgroundColor: COLOURS.darkGrey,
                      width: "100%",
                      alignItems: "center",
                    },
                  ]}
                  onPress={closeTreatmentModal}
                >
                  <Text
                    style={[
                      styles.modalButton,
                      styles.buttonText,
                      { backgroundColor: "transparent" },
                    ]}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      case "null": // delayed treatment
        return (
          <View style={{ gap: 24 }}>
            <Text
              style={{
                borderTopColor: "#D8EAE9",
                borderTopWidth: 1,
                borderBottomColor: "#D8EAE9",
                borderBottomWidth: 1,
                paddingBlock: 10,
                fontWeight: 600,
              }}
            >
              Recommended Treatment{" "}
              <Text style={{ color: COLOURS.colour3, fontWeight: "bold" }}>
                Oxalic Acid
              </Text>
            </Text>
            <View style={{ justifyContent: "space-between", height: "80%" }}>
              <AlertBanner alertType="treatmentTemporarilyUnavailable" />
              {/* <Image
                source={require("../../assets/treatInfo.png")}
                style={{ alignSelf: "center" }}
              /> */}
              <TreatInfo style={{ alignSelf: "center" }} />
              <View
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 24,
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    { backgroundColor: COLOURS.darkGrey },
                  ]}
                  onPress={closeTreatmentModal}
                >
                  <Text
                    style={[
                      styles.modalButton,
                      styles.buttonText,
                      { backgroundColor: "transparent" },
                    ]}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      case "success":
        return (
          <View style={{ gap: 24 }}>
            <Text
              style={{
                borderTopColor: "#D8EAE9",
                borderTopWidth: 1,
                borderBottomColor: "#D8EAE9",
                borderBottomWidth: 1,
                paddingBlock: 10,
                fontWeight: 600,
              }}
            >
              {treatment.replace(
                /\w\S*/g,
                (text) =>
                  text.charAt(0).toUpperCase() +
                  text.substring(1).toLowerCase(),
              )}
              <Text style={{ color: COLOURS.colour3, fontWeight: "bold" }}>
                {" "}
                Treatment Applied
              </Text>
            </Text>
            <View style={{ justifyContent: "space-between", height: "80%" }}>
              <Text>
                {`The recommended treatment has been applied on ${lastCheckDate.toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    day: "numeric",
                  },
                )} at ${new Date().toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}. You can view it in your hive history. `}
              </Text>
              <MaterialCommunityIcons
                name="check-circle"
                size={150}
                color="#37c09e"
                style={{ alignSelf: "center" }}
              />

              <View
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 24,
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      backgroundColor: COLOURS.darkGrey,
                      width: "100%",
                      alignItems: "center",
                    },
                  ]}
                  onPress={closeTreatmentModal}
                >
                  <Text
                    style={[
                      styles.modalButton,
                      styles.buttonText,
                      { backgroundColor: "transparent" },
                    ]}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      case "error":
        return (
          <View style={{ gap: 24 }}>
            <Text
              style={{
                borderTopColor: "#D8EAE9",
                borderTopWidth: 1,
                borderBottomColor: "#D8EAE9",
                borderBottomWidth: 1,
                paddingBlock: 10,
                fontWeight: 600,
              }}
            >
              {"Oxalic Acid"}
              <Text style={{ color: COLOURS.colour3, fontWeight: "bold" }}>
                {" "}
                Treatment Application Failed
              </Text>
            </Text>
            <View style={{ justifyContent: "space-between", height: "80%" }}>
              <Text>
                The recommended treatment has not been applied due to an error.
              </Text>
              <MaterialCommunityIcons
                name="close-circle"
                size={150}
                color="#ff626d"
                style={{ alignSelf: "center" }}
              />

              <View
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 24,
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    { backgroundColor: COLOURS.darkGrey },
                  ]}
                  onPress={closeTreatmentModal}
                >
                  <Text
                    style={[
                      styles.modalButton,
                      styles.buttonText,
                      { backgroundColor: "transparent" },
                    ]}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      // if there is a treatment
      default:
        return (
          <View style={{ gap: 24 }}>
            <Text
              style={{
                borderTopColor: "#D8EAE9",
                borderTopWidth: 1,
                borderBottomColor: "#D8EAE9",
                borderBottomWidth: 1,
                paddingBlock: 10,
                fontWeight: 600,
              }}
            >
              Recommended Treatment:{" "}
              <Text style={{ color: COLOURS.colour3, fontWeight: "bold" }}>
                {treatment.replace(
                  /\w\S*/g,
                  (text) =>
                    text.charAt(0).toUpperCase() +
                    text.substring(1).toLowerCase(),
                )}
              </Text>
            </Text>
            <View
              style={{
                justifyContent: "space-between",
                // flex: 1,
                height: "85%",
              }}
            >
              {(new Date().getFullYear() !==
                new Date(lastCheckDate).getFullYear() ||
                new Date().getMonth() !== new Date(lastCheckDate).getMonth() ||
                new Date().getDate() !== new Date(lastCheckDate).getDate()) && (
                <AlertBanner alertType="recommendationExpired" />
              )}
              <Text>
                {`This treatment is recommended based on your mite check from ${lastCheckDate.toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    day: "numeric",
                  },
                )}.`}
              </Text>
              {/* <Image
                source={require("../../assets/treatInfo.png")}
                style={{ alignSelf: "center" }}
              /> */}
              <TreatInfo style={{ alignSelf: "center" }} />
              <View
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 24,
                }}
              >
                <ConfirmCheckbox
                  approvedTreatment={approvedTreatment}
                  setApprovedTreatment={setApprovedTreatment}
                  disabled={
                    new Date().getFullYear() !==
                      new Date(lastCheckDate).getFullYear() ||
                    new Date().getMonth() !==
                      new Date(lastCheckDate).getMonth() ||
                    new Date().getDate() !== new Date(lastCheckDate).getDate()
                  }
                />
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      width: "100%",
                      alignItems: "center",
                      backgroundColor:
                        new Date().getFullYear() !==
                          new Date(lastCheckDate).getFullYear() ||
                        new Date().getMonth() !==
                          new Date(lastCheckDate).getMonth() ||
                        new Date().getDate() !==
                          new Date(lastCheckDate).getDate() ||
                        !approvedTreatment
                          ? "#e0e0e0"
                          : COLOURS.colour3,
                    },
                  ]}
                  onPress={() => {
                    setTreatment("success");
                    setAlerts((alerts) => [
                      ...alerts.filter((i) => i != "infestationDetected"),
                      "treatmentComplete",
                    ]);
                  }}
                  disabled={
                    new Date().getFullYear() !==
                      new Date(lastCheckDate).getFullYear() ||
                    new Date().getMonth() !==
                      new Date(lastCheckDate).getMonth() ||
                    new Date().getDate() !==
                      new Date(lastCheckDate).getDate() ||
                    !approvedTreatment
                  }
                >
                  <Text
                    style={[
                      styles.modalButton,
                      styles.buttonText,
                      {
                        backgroundColor: "transparent",
                        color:
                          new Date().getFullYear() !==
                            new Date(lastCheckDate).getFullYear() ||
                          new Date().getMonth() !==
                            new Date(lastCheckDate).getMonth() ||
                          new Date().getDate() !==
                            new Date(lastCheckDate).getDate()
                            ? "#8b8b8b"
                            : "#FFF",
                      },
                    ]}
                  >
                    Apply Treatment
                  </Text>
                </TouchableOpacity>
                {!(
                  new Date().getFullYear() !==
                    new Date(lastCheckDate).getFullYear() ||
                  new Date().getMonth() !==
                    new Date(lastCheckDate).getMonth() ||
                  new Date().getDate() !== new Date(lastCheckDate).getDate()
                ) && (
                  <Text
                    onPress={() => {
                      closeTreatmentModal();
                      setAlerts((alerts) => [...alerts, "treatmentNotApplied"]);
                    }}
                  >
                    Not now
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
    }
  };

  const handleUploadImage = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      includeBase64: true,
    });
    if (result.didCancel) {
      console.log("User cancelled image picker");
    } else if (result.errorCode) {
      console.log(result.errorMessage);
      setImageStatus("Error Uploading Image");
    } else if (result.assets && result.assets.length > 0) {
      const source = result.assets![0]; //Unwrap the result assets and grab the first item (the captured image)
      setEncodedImage(`data:${source.type};base64,${source.base64}`);
      setImageURI(source.uri);
      setImageStatus("Uploaded Image Successfully");
      getNextStep(5);
    }
  };

  const handleTakePhoto = async () => {
    const result = await launchCamera({
      mediaType: "photo",
      cameraType: "back",
      includeBase64: true, // optional (only if you need it for upload)
    });

    if (result.didCancel) {
      console.log("User cancelled camera");
    } else if (result.errorCode) {
      console.log(result.errorMessage);
      setImageStatus("Error Taking Image");
    } else if (result.assets && result.assets.length > 0) {
      const source = result.assets![0]; //Unwrap the result assets and grab the first item (the captured image)
      setEncodedImage(`data:${source.type};base64,${source.base64}`);
      setImageURI(source.uri);
      setImageStatus("Image Captured Successfully");
      getNextStep(5);
    }
  };

  const handleStartAnalysis = async () => {
    try {
      setIsAnalyzing("Analyzing");
      const response = await fetch(`${BACKEND_URL}/temperature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temperature: temperature == "" ? "20" : temperature,
          image: encodedImage,
          overrideTreatment: "formic acid", // type in any treatment name string here, or leave it none
          numDays: numDays,
        }),
      });
      if (response.ok) {
        // Parse the response body as JSON
        const jsonResponse = await response.json();
        // Extract the actual response content
        const responseData: {
          mite_count: number;
          infestation: boolean;
          treatment_recommendation: string;
          delay: boolean;
        } = jsonResponse; // Adjust this according to the structure of your response

        // Now you can work with the actual response data
        console.log(responseData);
        const sessionUpdate = {
          ...sessionDetails,
          miteCount: responseData["mite_count"],
          infestation: responseData["infestation"],
          temperature: temperature,
          treatment: responseData["treatment_recommendation"],
          approval: "pending" as ApprovalType,
          delay: responseData["delay"],
          applied: "pending" as ApplicationType,
          updatedAt: new Date().toISOString(),
        };
        console.log(sessionUpdate);
        setSessionDetails(sessionUpdate);
        const currSession = uuid.v4();
        setSessionId(currSession);
        userStorage.set(currSession, JSON.stringify(sessionUpdate));
        userStorage.set("latestSession", currSession);
        setTreatment(responseData["treatment_recommendation"]);
        if (responseData["infestation"]) {
          setAlerts((alerts) => [...alerts, "infestationDetected"]);
        } else {
          setlastNotInfested(0);
        }

        setInfestation(responseData["infestation"]);
        setLatestMiteCount(responseData["mite_count"]);
        setNextCheck(30);
        setTreatmentUnread(true);
        setAlerts((prev) => [...prev, "recommendationAvailable"]);
        setLastCheckDate(new Date());
        // if infestation is false, also schedule a notification 3 months from now
        if (!responseData["infestation"]) {
          await schedulePushNotification(
            "It's time to check your hive!",
            "Take a quick picture of your sticky board to start the process",
            THREE_MONTHS,
          ); // 3 months in seconds
        }
        setIsAnalyzing("Analysis Completed");
      } else {
        // Handle error response
        console.error("Error:", response.statusText);
        setIsAnalyzing("Analysis Failed");
      }
    } catch (error) {
      console.error(error);
      setIsAnalyzing("Analysis Failed");
    }
  };

  const { width, height } = Dimensions.get("window");

  const getTimeOfDay = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour > 3 && hour < 12) {
      return "Morning";
    }
    if (hour >= 12 && hour < 17) {
      return "Afternoon";
    }
    return "Evening";
  };

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={{ paddingBottom: 50 }}
    >
      {/* Greeting */}
      <View
        style={{
          gap: 10,
          paddingHorizontal: 8,
          paddingBlock: 16,
        }}
      >
        <Text style={{ fontSize: 16 }}>Good {getTimeOfDay()},</Text>
        <Text style={styles.h1}>Aashi</Text>
      </View>
      {/* Alerts */}
      <View>
        {alerts.map((a, i) => (
          <AlertBanner
            alertType={a}
            key={i}
            closeAlert={() => setAlerts((prev) => prev.filter((x) => x != a))}
          />
        ))}
      </View>
      {/* Summary */}
      <View
        style={{
          backgroundColor: COLOURS.tertiary,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingBlock: 20,
          marginTop: 20,
          gap: 5,
        }}
      >
        <Text style={styles.h2}>Hive Overview</Text>
        <Text style={styles.subtitle}>Last Updated: {lastUpdated}</Text>
        <View
          style={{
            marginTop: 21,
            flexDirection: "row",
            gap: 8,
            justifyContent: "space-between",
          }}
        >
          <View style={styles.overviewInfo}>
            <View
              style={{ flexDirection: "row", gap: 8, alignItems: "baseline" }}
            >
              <Ionicons name="bug-outline" />
              <Text>Not Infested</Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
            >
              <Text style={styles.h1}>{lastNotInfested}</Text>
              <Text>{lastNotInfested == 1 ? "day" : "days"} ago</Text>
            </View>
          </View>
          <View style={styles.overviewInfo}>
            <View
              style={{ flexDirection: "row", gap: 8, alignItems: "baseline" }}
            >
              <MaterialCommunityIcons name="calendar" />
              <Text>Next Mite Check</Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}
            >
              <Text style={[styles.h1, nextCheck < 0 && { color: "#FF0014" }]}>
                {Math.abs(nextCheck)}
              </Text>
              <Text style={nextCheck < 0 && { color: "#FF0014" }}>
                {nextCheck < 0
                  ? `${nextCheck == -1 ? "day" : "days"} overdue`
                  : nextCheck == 1
                    ? "day"
                    : "days"}
              </Text>
            </View>
          </View>
        </View>
      </View>
      {/* Buttons */}
      <View style={{ marginBlock: 20, width: "100%", gap: 10 }}>
        <ActionButton
          text="Check Infestation Status"
          onPressFunction={() => setModalVisible(true)}
        />
        <ActionButton
          text="Treatment Recommendation"
          onPressFunction={() => {
            setTreatmentUnread(false);
            setAlerts((prev) =>
              prev.filter((i) => i != "recommendationAvailable"),
            );
            setTreatmentModalVisible(true);
          }}
          unread={treatmentUnread}
        />
        <ActionButton
          text="Treatment Management"
          onPressFunction={() => null}
        />
        <ActionButton text="Resources" onPressFunction={() => null} />
        <ActionButton
          text="Reset (testing)"
          onPressFunction={() => {
            setlastNotInfested(32);
            setNextCheck(-1);
            setLastCheckDate(new Date("2026-01-26"));
            setAlerts([]);
          }}
        />

        {/* Sticky Board Modal */}
        <Modal
          isVisible={isModalVisible}
          onBackdropPress={closeUploadModal}
          onBackButtonPress={closeUploadModal}
          onSwipeComplete={closeUploadModal}
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
            <Text style={styles.title}>
              {treatmentStep == 0 ? "Infestation Status" : "Scan Sticky Board"}
            </Text>

            <Animated.View
              style={{
                flex: 1,
                transform: [{ translateX: slideAnim }],
              }}
            >
              {renderStep(treatmentStep)}
              {/* Animated Overlay */}
              {overlayVisible && (
                <Animated.View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      backgroundColor: "rgba(218, 218, 218, 0.95)",
                      justifyContent: "center",
                      alignItems: "center",
                      opacity: fadeAnim,
                      zIndex: 999,
                      elevation: 999,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "400",
                      marginBottom: 20,
                    }}
                  >
                    Upload Successful
                  </Text>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={60}
                    color="#000000"
                    style={{ alignSelf: "center" }}
                  />
                </Animated.View>
              )}
            </Animated.View>
          </View>
        </Modal>
        {/* Treatment Modal */}
        <Modal
          isVisible={treatmentModalVisible}
          onBackdropPress={closeTreatmentModal}
          onBackButtonPress={closeTreatmentModal}
          onSwipeComplete={closeTreatmentModal}
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
            <Text style={styles.title}>Mite Treatment</Text>
            <Animated.View
              style={{
                flex: 1,
                transform: [{ translateX: slideAnim }],
              }}
            >
              {renderTreatment()}
            </Animated.View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}
