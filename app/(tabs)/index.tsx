import { Button } from "@expo/ui/jetpack-compose";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
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
import { launchImageLibrary } from "react-native-image-picker";
import Modal from "react-native-modal";
import uuid from "react-native-uuid";
import { notificationStorage, userStorage } from "../../index";

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
export default function Index() {
  // STATES
  const [treatmentStep, setTreatmentStep] = useState(1);
  const [alerts, setAlerts] = useState<
    { level: string; title: string; body: string }[]
  >([{ level: "warning", title: "testtitle", body: "testbody" }]);
  const [imageStatus, setImageStatus] = useState("");
  const [nextStep, setNextStep] = useState<number | null>(null);
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
  }>({
    userInputs: undefined,
    miteCount: undefined,
    infestation: undefined,
    temperature: undefined,
    treatment: undefined,
    approval: undefined,
    delay: undefined,
    applied: undefined,
  });
  const [channels, setChannels] = useState<Notifications.NotificationChannel[]>(
    []
  );
  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >(undefined);
  const [sessionId, setSessionId] = useState("");
  const [isConnected, setIsConnected] = useState(false); //Is a device connected?
  const [isAnalyzing, setIsAnalyzing] = useState("Start Analysis"); //Is the analysis process ongoing?
  const [treatment, setTreatment] = useState<string>(""); //Treatment value returned
  const [infestation, setInfestation] = useState<boolean | undefined>(
    undefined
  ); //Infestation boolean value returned
  const [connectedDevice, setConnectedDevice] = useState<BLEDevice>(); //What device is connected?
  const [temperature, setTemperature] = useState("");
  const [treatmentOnMicrocontroller, setTreatmentOnMicrocontroller] = useState<
    string | null
  >(null); // treatment value that microcontroller has
  const [encodedImage, setEncodedImage] = useState("");

  // CONSTANTS
  const BACKEND_URL = "https://loriann-imbricative-transfixedly.ngrok-free.dev";
  const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const TEMPERATURE_UUID = "6d68efe5-04b6-4a85-abc4-c2670b7bf7fd";
  const TREATMENT_UUID = "f27b53ad-c63d-49a0-8c0f-9f297e6cc520";
  const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND-NOTIFICATION-TASK";
  // const CONSOLE_UUID = "";
  const THREE_MONTHS = 3 * 30 * 24 * 60 * 60; // in seconds

  const BLTManager = new BleManager();

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
      }
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
      console.log("token is", token); //ExponentPushToken[7csFM6L1BmTvSUz3ytH-5j]
    } catch (e) {
      token = `${e}`;
    }

    return token;
  }

  useEffect(() => {
    registerForPushNotificationsAsync().then(
      (token) => token && setExpoPushToken(token)
    );
    Notifications.getNotificationChannelsAsync().then((value) =>
      setChannels(value ?? [])
    );
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
      }
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
    seconds?: number
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
      };
      notificationStorage.set(
        notificationId,
        JSON.stringify(notificationDetails)
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
          ]
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
          console.log("DC completed")
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
      base64.encode(value)
    ).then((characteristic) => {
      if (characteristic.value)
        console.log(
          "Treatment written to microcontroller: ",
          base64.decode(characteristic.value)
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
                base64.decode(characteristic?.value)
              );
            }
          },
          "temperaturetransaction"
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
                base64.decode(characteristic?.value)
              );
              // now that its received an update of what the microcontroller sees, it will update
              console.log(
                "Treatment update received: ",
                base64.decode(characteristic?.value)
              );
            }
          },
          "treatmenttransaction"
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

  const closeUploadModal = () => {
    setModalVisible(false);
    setTreatmentStep(1);
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
      case 1:
        return (
          <>
            <Text>
              This check helps you understand whether your hive has a Varroa
              mite infestation.
            </Text>
            <Text>Before you start</Text>
            <Text>
              When you're ready, go to your hive to start the mite check
            </Text>
            <Text>For best results, complete this check with daylight</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => getNextStep(2)}
            >
              <Text style={styles.buttonText}>Start check</Text>
            </TouchableOpacity>
            <Text onPress={closeUploadModal}>Skip tutorial</Text>
          </>
        );
      case 2:
        return (
          <>
            <Text>Instructions</Text>
            <Text>
              Slide out the bottom board holding the sticky board , keeping it
              flat and steady
            </Text>
            <Text>Disturbing the surface may affect mite counts</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => getNextStep(3)}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </>
        );
      case 3:
        return (
          <>
            <Text>Instructions</Text>
            <Text>Take a photo of your hive's sticky board</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleUploadImage()}
            >
              <Text style={styles.buttonText}>Upload Image</Text>
            </TouchableOpacity>
            {imageStatus != "" && (
              <>
                <Text>{imageStatus}</Text>
                <TouchableOpacity
                  style={styles.button}
                  onPress={() => {
                    handleStartAnalysis(temperature);
                  }}
                  disabled={isAnalyzing != "Start Analysis"}
                >
                  <Text style={styles.buttonText}>{isAnalyzing}</Text>
                </TouchableOpacity>
              </>
            )}
            {isAnalyzing == "Analysis Completed" && (
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  closeUploadModal();
                  setTreatmentModalVisible(true);
                }}
              >
                <Text style={styles.buttonText}>Go to treatment modal</Text>
              </TouchableOpacity>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const renderTreatment = () => {
    switch (treatment) {
      case "None":
        return (
          <>
            <Text>Treatment Not Recommended</Text>
            <Text>
              Based on your mite check from January 12, no infestation is
              detected and treatment is not necessary
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => closeTreatmentModal}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </>
        );
      case "null":
        return (
          <>
            <Text>Recommended Treatment: Oxalic Acid</Text>
            <Text>Alert Component (need to fix this)</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => closeTreatmentModal}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </>
        );
      case "success":
        return (
          <>
            <Text>{treatment}: Applied</Text>
            <Text>
              The recommended treatment has been applied on Jan 12 at 11:59pm.
              You can view it in your hive history.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => closeTreatmentModal}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </>
        );
      case "error":
        return (
          <>
            <Text>{treatment}: Treatment Application Failed</Text>
            <Text>
              The recommended treatment has not been applied due to an error.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => closeTreatmentModal}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </>
        );
      // if there is a treatment
      default:
        const today = new Date().toDateString();
        return (
          <>
            <Text>Recommended Treatment: {treatment}</Text>
            <Text>
              This treatment is recommended based on your mite check from{" "}
              {today}. Learn more
            </Text>
            <Text>
              I understand that this action will apply the recommended treatment
              inside my beehive
            </Text>
            <TouchableOpacity
              disabled={!isConnected} // also add the checkbox condition here
              style={styles.button}
              onPress={() => {
                const sessionUpdate = {
                  ...sessionDetails,
                  approval: "approved" as ApprovalType,
                };
                setSessionDetails(sessionUpdate);
                userStorage.set(sessionId, JSON.stringify(sessionUpdate));
                sendTreatment(treatment);
              }}
            >
              <Text style={styles.buttonText}>Apply Treatment</Text>
            </TouchableOpacity>
            <Text onPress={() => closeTreatmentModal()}>Not Now</Text>
          </>
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
      setImageStatus("Uploaded Image Successfully");
    }
  };

  const handleStartAnalysis = async (temperature: string) => {
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
          overrideTreatment: "test treatment", // type in any treatment name string here, or leave it none
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
        };
        console.log(sessionUpdate);
        setSessionDetails(sessionUpdate);
        const currSession = uuid.v4();
        setSessionId(currSession);
        userStorage.set(currSession, JSON.stringify(sessionUpdate));
        setTreatment(responseData["treatment_recommendation"]);
        setInfestation(responseData["infestation"]);
        // if infestation is false, also schedule a notification 3 months from now
        if (!responseData["infestation"]) {
          await schedulePushNotification(
            "It's time to check your hive!",
            "Take a quick picture of your sticky board to start the process",
            THREE_MONTHS
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

  const { height, width } = Dimensions.get("window");
  const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "center", alignItems: "center" },
    modal: { justifyContent: "flex-end", margin: 0 },
    sheet: {
      height: height * 0.8,
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
      marginBottom: 15,
    },
    title: {
      fontSize: 18,
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
    buttonText: {
      color: "white",
      fontWeight: "600",
      textAlign: "center",
    },
    success: { backgroundColor: "#E7F4E8" },
    warning: { backgroundColor: "#FFF4E4" },
    error: { backgroundColor: "#FFE2E5" },
    generalAlert: { backgroundColor: "#EAF2FF" },
  });

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
    <ScrollView>
      {/* Greeting */}
      <View>
        <Text>Good {getTimeOfDay()},</Text>
        <Text>Implement Name</Text>
      </View>
      {/* Alerts */}
      <View>
        {alerts.map((a: { level: string; title: string; body: string }) => (
          <View
            style={
              a.level == "success"
                ? styles.success
                : a.level == "warning"
                ? styles.warning
                : a.level == "error"
                ? styles.error
                : styles.generalAlert
            }
          >
            <Text>{a.title}</Text>
            <Text>{a.body}</Text>
          </View>
        ))}
      </View>
      {/* Summary */}
      <View>
        <Text>Hive Overview</Text>
        <Text>Last Updated: {Date.now().toString()}</Text>
        <View>
          <Text>Not Infested</Text>
          <Text>implement</Text>
        </View>
        <View>
          <Text>Next Mite Check</Text>
          <Text>implement</Text>
        </View>
      </View>
      {/* Buttons */}
      <View>
        <Button
          onPress={() => setModalVisible(true)}
          style={{ width: 200, marginBottom: 10 }}
        >
          Scan sticky board
        </Button>
        <Button
          onPress={() => setTreatmentModalVisible(true)}
          style={{ width: 250, marginBottom: 10 }}
        >
          Treatment Recommendation
        </Button>
        <Button style={{ width: 150, marginBottom: 10 }}>Hive History</Button>
        <Button style={{ width: 150, marginBottom: 10 }}>Resources</Button>

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
            <Text style={styles.title}>Check your mite levels</Text>
            <Animated.View
              style={{
                flex: 1,
                transform: [{ translateX: slideAnim }],
              }}
            >
              {renderStep(treatmentStep)}
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
