import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Linking,
  LogBox,
  PermissionsAndroid,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import base64 from "react-native-base64";
import { Device as BLEDevice, BleManager } from "react-native-ble-plx";
import { launchImageLibrary } from "react-native-image-picker";
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
type ApprovalType = "pending" | "approved" | "declined";
type ApplicationType = "pending" | "success" | "error" | "null";
function HomeScreen() {
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
  const [sessionId, setSessionId] = useState(""); // does it need to be kept in state
  const descriptionRef = useRef("");

  const backendUrl = "https://loriann-imbricative-transfixedly.ngrok-free.dev";
  const BLTManager = new BleManager();

  // update these
  const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
  const TEMPERATURE_UUID = "6d68efe5-04b6-4a85-abc4-c2670b7bf7fd";
  const TREATMENT_UUID = "f27b53ad-c63d-49a0-8c0f-9f297e6cc520";

  //Is a device connected?
  const [isConnected, setIsConnected] = useState(false);

  //Is the analysis process ongoing?
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  //Treatment value returned
  const [treatment, setTreatment] = useState<string>("");

  //Infestation boolean value returned
  const [infestation, setInfestation] = useState<boolean | undefined>(
    undefined
  );

  //What device is connected?
  const [connectedDevice, setConnectedDevice] = useState<BLEDevice>();

  const [temperature, setTemperature] = useState("");
  // const [treatment, setTreatment] = useState(false);
  const [treatmentOnMicrocontroller, setTreatmentOnMicrocontroller] = useState<
    string | null
  >(null);

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
    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  async function schedulePushNotification(seconds?: number) {
    // update this to be 3 months from now
    const content = {
      title: "Test notification",
      body: "123",
      data: { data: "data", test: { test1: "more data" } },
    };
    const delay = 3 * 30 * 24 * 60 * 60;
    const sendDate = new Date();
    sendDate.setSeconds(sendDate.getSeconds() + delay);

    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: seconds || 30,
        // seconds: delay,
      },
    }).then((res) => {
      console.log("notification scheduled response: ", res); // 75eb45cc-ed67-4536-b270-d0c1eadbebd4
      const notificationId = uuid.v4();
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

  // doesnt seem to be used
  // useEffect(() => {
  //   if (!connectedDevice || !connectedDevice.isConnected) {
  //     return;
  //   }
  //   const sub = connectedDevice.monitorCharacteristicForService(
  //     SERVICE_UUID,
  //     TEMPERATURE_UUID,
  //     (error, characteristic) => {
  //       if (error || !characteristic?.value) {
  //         return;
  //       }
  //       setTemperature(base64.decode(characteristic?.value));
  //       console.log(
  //         "USEEFFECT Message update received: ",
  //         base64.decode(characteristic?.value)
  //       );
  //     }
  //   );
  //   return () => sub.remove();
  // }, [connectedDevice]);

  async function openAppNotificationSettings() {
    await Linking.openSettings();
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
              // setTreatment(StringToBool(base64.decode(valenc?.value)));
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

        console.log("Connection established");
      });
  }

  const [encodedImage, setEncodedImage] = useState("");

  const handleUploadImage = async () => {
    const result = await launchImageLibrary({
      mediaType: "photo",
      includeBase64: true,
    });
    if (result.didCancel) {
      console.log("User cancelled image picker");
    } else if (result.errorCode) {
      console.log(result.errorMessage);
    } else if (result.assets && result.assets.length > 0) {
      console.log("got an image");
      const source = result.assets![0]; //Unwrap the result assets and grab the first item (the captured image)
      setEncodedImage(`data:${source.type};base64,${source.base64}`);
    }
  };

  const handleStartAnalysis = async (temperature: string) => {
    try {
      setIsAnalyzing(true);
      const response = await fetch(`${backendUrl}/temperature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temperature: temperature == "" ? "20" : temperature,
          image: encodedImage,
          overrideTreatment: null, // type in any treatment name string here, or leave it none
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
          miteCount: 100, // responseData["mite_count"],
          infestation: true, // responseData["infestation"],
          temperature: "20", // temperature,
          treatment: "thymol", // responseData["treatment_recommendation"],
          approval: "pending" as ApprovalType,
          delay: false, //responseData["delay"], // verify that the boolean works here
          applied: "pending" as ApplicationType,
        };
        setSessionDetails(sessionUpdate);
        const currSession = uuid.v4();
        setSessionId(currSession);
        userStorage.set(currSession, JSON.stringify(sessionUpdate));
        setTreatment(responseData["treatment_recommendation"]);
        setInfestation(responseData["infestation"]); // also check if boolean works here
        // if infestation is false, also schedule a notification 3 months from now
        // if (!responseData["infestation"]) {
        //   await schedulePushNotification(7.884 * 10 ** 6); // 3 months from now
        // }
      } else {
        // Handle error response
        console.error("Error:", response.statusText);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <View>
      <View style={{ paddingBottom: 200 }}></View>

      {/* Title */}
      <View
        style={{
          justifyContent: "space-around",
          alignItems: "flex-start",
          flexDirection: "row",
        }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
          }}
        >
          BeeWare
        </Text>
      </View>

      <View style={{ paddingBottom: 20 }}></View>

      {/* Connect Button */}
      <View
        style={{
          justifyContent: "space-around",
          alignItems: "flex-start",
          flexDirection: "row",
        }}
      >
        <TouchableOpacity style={{ width: 120 }}>
          {!isConnected ? (
            <Button
              title="Connect"
              onPress={() => {
                scanDevices();
              }}
              disabled={false}
            />
          ) : (
            <Button
              title="Disconnect"
              onPress={() => {
                disconnectDevice();
              }}
              disabled={false}
            />
          )}
        </TouchableOpacity>
      </View>

      <View style={{ paddingBottom: 20 }}></View>

      {/* Monitored Temp Value */}
      <View
        style={{
          justifyContent: "space-around",
          alignItems: "flex-start",
          flexDirection: "row",
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Cochin",
          }}
        >
          {temperature == ""
            ? "Nothing yet"
            : "Current temperature: " + temperature}
        </Text>
      </View>

      <View style={{ paddingBottom: 20 }}></View>

      {/* Infestation determined */}
      <View
        style={{
          justifyContent: "space-around",
          alignItems: "flex-start",
          flexDirection: "row",
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Cochin",
          }}
        >
          {infestation == true
            ? "Your hive is infested, see our recommendation"
            : infestation == false
            ? "Come back in 3 months, we'll send you a notification"
            : "Run analysis to see if your hive is infested"}
        </Text>
      </View>

      <View style={{ paddingBottom: 20 }}></View>

      {/* Treatment Recommended Value */}
      <View
        style={{
          justifyContent: "space-around",
          alignItems: "flex-start",
          flexDirection: "row",
        }}
      >
        <Text
          style={{
            fontSize: 15,
            fontFamily: "Cochin",
          }}
        >
          {treatment == null
            ? "Run analysis to get a treatment"
            : treatment == "null"
            ? "The temperature isn't quite right, don't treat the hive for now!"
            : "We recommend " + treatment}
        </Text>
      </View>

      <View style={{ paddingBottom: 20 }}></View>

      {/* Start Analysis Button */}
      <View
        style={{
          justifyContent: "space-around",
          alignItems: "flex-start",
          flexDirection: "row",
        }}
      >
        <TouchableOpacity style={{ width: 120 }}>
          {!isAnalyzing ? (
            <Button
              title={
                temperature == "" ? "Needs a temp first" : "Start Analysis"
              }
              onPress={() => {
                handleStartAnalysis(temperature);
              }}
              // disabled={temperature == "" ? true : false}
            />
          ) : (
            <Button title="Analyzing" disabled={false} />
          )}
        </TouchableOpacity>
      </View>

      {/* Upload Image Button */}
      <View
        style={{
          justifyContent: "space-around",
          alignItems: "flex-start",
          flexDirection: "row",
        }}
      >
        <TouchableOpacity style={{ width: 120 }}>
          <Button
            title="Upload Image"
            disabled={false}
            onPress={() => handleUploadImage()}
          />
          <Button
            title="Schedule Notification"
            onPress={async () => {
              await schedulePushNotification();
            }}
          />
          <Button
            title={
              sessionDetails.approval == "pending"
                ? "Approve recommended treatment"
                : "Treatment approved...sent to pump"
            }
            onPress={() => {
              const sessionUpdate = {
                ...sessionDetails,
                approval: "approved" as ApprovalType,
              };
              setSessionDetails(sessionUpdate);
              userStorage.set(sessionId, JSON.stringify(sessionUpdate));
              if (treatment != "null") {
                sendTreatment(treatment);
              }
            }}
            disabled={
              sessionDetails.approval != "pending" || treatment == "null"
            }
          />
          <Button
            title="Get last notification details"
            onPress={() => {
              const notifIds = notificationStorage.getAllKeys();
              const data =
                notifIds.length > 0
                  ? notificationStorage.getString(notifIds[0]) || ""
                  : "";
              console.log("notif details from database", JSON.parse(data));
            }}
            disabled={false}
          />
        </TouchableOpacity>
      </View>

      {/* <View style={{ height: Dimensions.get("screen").height - 132 }}>
        <Text
          style={{
            fontSize: 18,
            margin: 16,
            fontWeight: "700",
          }}
        >
          TASK LIST
        </Text>
        <TextInput
          placeholder="Enter New Task"
          autoCapitalize="none"
          nativeID="description"
          multiline={true}
          numberOfLines={8}
          value={descriptionRef.current}
          onChangeText={(text) => {
            descriptionRef.current = text;
          }}
          style={{
            fontSize: 20,
            borderWidth: 1,
            borderRadius: 4,
            // borderColor: "#455fff",
            paddingHorizontal: 8,
            paddingVertical: 4,
            marginBottom: 0,
            marginHorizontal: 16,
          }}
        />
        <TouchableOpacity
          style={{
            backgroundColor: "grey",
            padding: 10,
            borderRadius: 5,
            marginTop: 8,
            marginLeft: 16,
            width: 120,
          }}
          onPress={() => {
            createNewTask();
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "600",
              fontSize: 12,
            }}
          >
            SAVE TASK
          </Text>
        </TouchableOpacity>
        <Text>{JSON.stringify(tasks, null, 2)}</Text>
      </View> */}
    </View>
  );
}

export default HomeScreen;
