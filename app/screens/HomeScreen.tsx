import React, { useRef, useState } from "react";
import { readFile } from "react-native-fs";

import {
  Button,
  PermissionsAndroid,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { launchImageLibrary } from "react-native-image-picker";

import { useQuery, useRealm } from "@realm/react";
import { LogBox } from "react-native";
import base64 from "react-native-base64";
import { BleManager, Device } from "react-native-ble-plx";
import { Task } from "../schemas/Task";

LogBox.ignoreLogs(["new NativeEventEmitter"]); // Ignore log notification by message
LogBox.ignoreAllLogs(); //Ignore all log notifications
function HomeScreen() {
  const tasks = useQuery(Task);
  const descriptionRef = useRef("");
  const realm = useRealm();

  const backendUrl = "http://10.10.101.47:8000";
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
  const [treatment, setTreatment] = useState(null);

  //Infestation boolean value returned
  const [infestation, setInfestation] = useState(null);

  //What device is connected?
  const [connectedDevice, setConnectedDevice] = useState<Device>();

  const [temperature, setTemperature] = useState("");
  // const [treatment, setTreatment] = useState(false);
  const [treatmentOnMicrocontroller, setTreatmentOnMicrocontroller] = useState<
    string | null
  >(null);

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

  // Scans availbale BLT Devices and then call connectDevice
  async function scanDevices() {
    PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]).then((answere) => {
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
  async function connectDevice(device: Device) {
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

  const [capturedImageURI, setCapturedImageURI] = useState("");

  const loadImageBase64 = async (capturedImageURI: string) => {
    try {
      const base64Data = await readFile(capturedImageURI, "base64");
      return "data:image/jpeg;base64," + base64Data;
    } catch (error) {
      console.error("Error converting image to base64:", error);
    }
  };
  const handleUploadImage = async () => {
    const result = await launchImageLibrary({ mediaType: "photo" });
    if (result.didCancel) {
      console.log("User cancelled image picker");
    } else if (result.errorCode) {
      console.log(result.errorMessage);
    } else {
      const source = result.assets![0]; //Unwrap the result assets and grab the first item (the captured image)
      setCapturedImageURI(source.uri!);
    }
  };

  const handleStartAnalysis = async (temperature: string) => {
    const base64Image = await loadImageBase64(capturedImageURI);
    try {
      setIsAnalyzing(true);
      const response = await fetch(`${backendUrl}/temperature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temperature: temperature == "" ? null : temperature,
          image: base64Image,
        }),
      });
      if (response.ok) {
        // Parse the response body as JSON
        const jsonResponse = await response.json();
        // Extract the actual response content
        const responseData = jsonResponse; // Adjust this according to the structure of your response

        // Now you can work with the actual response data
        console.log(responseData);
        setTreatment(responseData["treatment_recommendation"]);
        setInfestation(responseData["infestation"]);
        sendTreatment(responseData["treatment_recommendation"]);
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

  // const createNewTask = () => {
  //   realm.write(() => {
  //     const newTask = new Task(realm, descriptionRef.current);

  //     // clear input field
  //     descriptionRef.current = "";

  //     // return task
  //     return newTask;
  //   });
  // };

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
          {infestation == null
            ? "Run analysis to see if your hive is infested"
            : "Infestation " + infestation}
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
              disabled={temperature == "" ? true : false}
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
