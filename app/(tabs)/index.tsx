import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "expo-router";
import * as TaskManager from "expo-task-manager";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { launchImageLibrary } from "react-native-image-picker";
import Modal from "react-native-modal";
import uuid from "react-native-uuid";
import { Camera } from "react-native-vision-camera";
import ScanInfoOne from "../../assets/scanInfo1.svg";
import ScanInfoTwo from "../../assets/scanInfo2.svg";
import ScanInfoThree from "../../assets/scanInfo3.svg";
import TreatInfo from "../../assets/treatInfo.svg";
import {
  alertStorage,
  delayTreatmentStorage,
  notificationStorage,
  reservoirStorage,
  scheduledTreatmentStorage,
  userStorage,
} from "../../index";
import ActionButton from "../components/ActionButton";
import AlertBanner from "../components/AlertBanner";
import CircularLoader from "../components/CircularLoader";
import CircularProgress from "../components/CircularProgress";
import ConfirmCheckbox from "../components/ConfirmCheckbox";
import StickyBoardCamera from "../components/StickyBoardCamera";
import ToggleButton from "../components/ToggleButton";
import TreatmentTimeline from "../components/TreatmentTimeline";
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
type ApplicationType = "pending" | "success" | "error";
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
  | "treatmentNotApplied"
  | "imageNotClear"
  | "nextRoundReady";
type TreatmentStatusType =
  | "Fpump activated"
  | "Fpump turned off"
  | "Opump activated"
  | "Opump turned off"
  | "Tpump activated"
  | "Tpump turned off"
  | "All pumps off"
  | "All pumps off, ready"
  | "X: Fpump not on"
  | "X: Opump not on"
  | "X: Tpump not on";
type MiteCheckStatusType = "not started" | "pending" | "success" | "error";
type TreatmentType = "Oxalic Acid" | "Thymol" | "Formic Acid";
// CONSTANTS
const BACKEND_URL = "https://careers-mega-lucky-karma.trycloudflare.com";
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const TEMPERATURE_UUID = "6d68efe5-04b6-4a85-abc4-c2670b7bf7fd";
const TREATMENT_UUID = "f27b53ad-c63d-49a0-8c0f-9f297e6cc520";
const STATUS_UUID = "d94602a9-e36e-4296-9514-fa2c3b9878c7";
const ONE_MONTH = 30 * 24 * 60 * 60; // in seconds
const ONE_DAY = 24 * 60 * 60; // in seconds
const APPLICATION_QUANTITIES: Record<TreatmentType, number> = {
  Thymol: 50,
  "Oxalic Acid": 50,
  "Formic Acid": 20,
};
const RESERVOIR_CAPACITY = 500;
const EDUCATION = [
  {
    title: "Ontario Varroa Management Guide",
    body: "Official guidelines from the Ontario Beekeepers' Association",
    url: "https://www.ontario.ca/page/varroa-mites",
  },
  {
    title: "Sticky Board Preparation Guide",
    body: "Guide for setting up a sticky board",
    url: "https://bestbeekeepinggear.com/sticky-board/",
  },
];
const TREATMENT = [
  {
    title: "Oxalic Acid Treatment Protocol",
    body: "Best practices for handling Oxalic Acid ",
    url: "https://www.ontariobee.com/sites/ontariobee.com/files/document/OA%20safety.pdf",
  },
  {
    title: "Formic Acid Treatment Protocol",
    body: "Best practices for handling Formic Acid",
    url: "https://www.mitegone.com/pdfpages/Safe%20use%20and%20Handling%20of%20Liquid%20Formic%20Acid.pdf",
  },
  {
    title: "Thymol  Treatment Protocol",
    body: "Best practices for handling Thymol",
    url: "https://www.perfectbee.com/beekeeping-articles/outside-the-swarm/treatment-free-beekeeping",
  },
];
const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND-NOTIFICATION-TASK";
const { width } = Dimensions.get("window");
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, (data) => {
  console.log("Notification received in background!", data);
  return Promise.resolve();
});
const getOrdinal = (n: number) => {
  {
    if (n > 3 && n < 21) return "th";
    switch (n % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }
};
const formatDates = (dates: Date[]) => {
  const formatted = dates.map((d) => {
    const month = d.toLocaleString("en-US", { month: "short" });
    const day = d.getDate();
    return `${month} ${day}${getOrdinal(day)}`;
  });

  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return formatted.join(" and ");

  return (
    formatted.slice(0, -1).join(", ") +
    ", and " +
    formatted[formatted.length - 1]
  );
};
const getTreatmentDates = (currTreatment: string) => {
  const t = currTreatment.toLocaleLowerCase();
  const steps = t == "formic acid" ? 5 : t == "thymol" ? 3 : 1;
  const intervalDays = t == "formic acid" ? 6 : t == "thymol" ? 13 : 0;
  const today = new Date();

  const dates = Array.from({ length: steps }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i * intervalDays);
    return d;
  });
  return dates;
};
export default function Index() {
  // STATES
  const [reservoirQuantity, setReservoirQuantity] = useState<
    Record<TreatmentType, number>
  >({ "Oxalic Acid": 100, "Formic Acid": 100, Thymol: 100 });
  const [reservoirStatus, setReservoirStatus] = useState<
    Record<TreatmentType, "Full" | "Empty">
  >({ "Formic Acid": "Full", "Oxalic Acid": "Full", Thymol: "Full" });
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
    new Date("2026-02-15"),
  );
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [imageError, setImageError] = useState<string | undefined>(undefined);
  const [verifyingImage, setVerifyingImage] = useState(false);
  const [approvedTreatment, setApprovedTreatment] = useState(false);
  const [latestMiteCount, setLatestMiteCount] = useState(13);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [nextCheck, setNextCheck] = useState(-1);
  const [lastNotInfested, setlastNotInfested] = useState(32);
  // user input for sticky board upload
  const [numDays, setNumDays] = useState(1);
  const [broodless, setBroodless] = useState("no");
  const [supersOn, setSupersOn] = useState("no");
  const [uploadStep, setUploadStep] = useState(0);
  const [currentTreatmentView, setCurrentTreatmentView] =
    useState<TreatmentType>("Oxalic Acid");
  const [alerts, setAlerts] = useState<Set<AlertType>>(new Set());
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [treatmentModalVisible, setTreatmentModalVisible] = useState(false);
  const [treatmentManagementModalVisible, setTreatmentManagementModalVisible] =
    useState(false);
  const [resourcesModalVisible, setResourcesModalVisible] = useState(false);
  const [sessionDetails, setSessionDetails] = useState<{
    miteCount?: number;
    treatment?: string;
    applied?: ApplicationType;
    date: string;
    miteCheckStatus: MiteCheckStatusType;
  }>({
    miteCount: undefined,
    treatment: undefined,
    applied: undefined,
    date: new Date().toISOString(),
    miteCheckStatus: "not started",
  });

  const [sessionId, setSessionId] = useState("");
  {
    /**for loading**/
  }
  const [isAnalyzing, setIsAnalyzing] = useState("Start Analysis"); //Is the analysis process ongoing?

  {
    /****/
  }
  const [treatment, setTreatment] = useState<string>("formic acid"); //Treatment value returned
  const [treatmentToRecommend, setTreatmentToRecommend] =
    useState<string>("formic acid"); //Treatment value returned
  const [treatmentApplied, setTreatmentApplied] =
    useState<string>("Formic Acid");
  const [foamPadRemovalDate, setFoamPadRemovalDate] = useState<string>("");
  const [treatmentStatus, setTreatmentStatus] = useState<
    TreatmentStatusType | string
  >("All pumps off, ready"); //Treatment status value returned
  const [treatmentStatusTick, setTreatmentStatusTick] = useState(0);
  const [treatmentUnread, setTreatmentUnread] = useState<boolean>(false);
  const [infestation, setInfestation] = useState<boolean | undefined>(
    undefined,
  ); //Infestation boolean value returned
  const [connectedDevice, setConnectedDevice] = useState<BLEDevice>(); //What device is connected?
  const [isConnected, setIsConnected] = useState(false);
  const [temperature, setTemperature] = useState("20");
  const [encodedImage, setEncodedImage] = useState("");
  const [imageURI, setImageURI] = useState<string | undefined>(undefined);
  const [detectionResultImageURI, setDetectionResultImageURI] = useState<
    string | undefined
  >(undefined);
  const [showCamera, setShowCamera] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  const BLTManager = useRef(new BleManager()).current;
  const shouldScan = useRef(true);
  const isScanning = useRef(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const slideAnim = useRef(new Animated.Value(0)).current;

  const tempRangeRef = useRef<{ min: number; max: number } | null>(null);

  const connectedDeviceRef = useRef<BLEDevice | undefined>(undefined);
  const isConnectedRef = useRef(false);

  const updateConnectedDevice = (device: BLEDevice | undefined) => {
    connectedDeviceRef.current = device;
    setConnectedDevice(device);
  };

  const updateIsConnected = (val: boolean) => {
    isConnectedRef.current = val;
    setIsConnected(val);
  };

  const updateTreatmentStatus = (status: string) => {
    setTreatmentStatus(status);
    setTreatmentStatusTick((t) => t + 1);
  };

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

  const reset = (
    treatmentToRecommend: "formic acid" | "oxalic acid" | "thymol",
  ) => {
    setlastNotInfested(32);
    setNextCheck(-1);
    setLastCheckDate(() => {
      const lastCheck = new Date();
      lastCheck.setSeconds(lastCheck.getSeconds() - 60 * 60 * 24 * 32);
      return lastCheck;
    });
    setAlerts(new Set());
    setApprovedTreatment(false);
    setIsAnalyzing("Start Analysis");
    setTreatmentUnread(false);
    setUploadStep(0);
    slideAnim.setValue(0);
    setImageError(undefined);
    setEncodedImage("");
    setImageURI(undefined);
    setTreatment("formic acid");
    setTreatmentToRecommend(treatmentToRecommend);
    console.log(connectedDevice);

    if (!connectedDeviceRef.current && !isConnectedRef.current) {
      setAlerts((prevAlerts) => {
        const newAlerts = new Set(prevAlerts);
        newAlerts.add("connectionError");
        return newAlerts;
      });
    }

    // wipe entries from this month
    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const allKeys = userStorage.getAllKeys();

    allKeys.forEach((key) => {
      if (key.startsWith(currentMonthPrefix)) {
        userStorage.remove(key);
      }
    });
  };
  useEffect(() => {
    console.log("connected device", connectedDevice);
    if (!connectedDevice && !isConnected) {
      setAlerts((prevAlerts) => {
        const newAlerts = new Set(prevAlerts);
        newAlerts.add("connectionError");
        return newAlerts;
      });
      scanDevices();
    }
    if (connectedDevice && isConnected) {
      setAlerts((prevAlerts) => {
        const newAlerts = new Set(prevAlerts);
        newAlerts.delete("connectionError");
        return newAlerts;
      });
      // checkScheduledTreatment();
    }
  }, [connectedDevice, isConnected]);
  useEffect(() => {
    console.log(treatmentStatus);
    const sendNotification = async (
      title: string,
      body: string,
      delay: number,
    ) => {
      try {
        await schedulePushNotification(title, body, delay);
      } catch (err) {
        console.error(err);
      }
    };

    const trimmed = treatmentStatus.trim();
    const status = trimmed.toLowerCase();
    const pumpMap: Record<string, TreatmentType> = {
      F: "Formic Acid",
      O: "Oxalic Acid",
      T: "Thymol",
    };
    if (status.startsWith("x:")) {
      setSessionDetails((prev) => ({ ...prev, applied: "error" }));

      const match = trimmed.match(/X:\s([FOT])pump not on/);
      const rawName = match ? pumpMap[match[1]] : "";
      const chemicalName = Object.keys(APPLICATION_QUANTITIES).find(
        (k) => k.toLowerCase() === rawName.toLowerCase(),
      ) as TreatmentType | undefined;

      if (!chemicalName) {
        console.error("Unknown treatment from BLE:", rawName);
        return;
      }

      userStorage.set(
        new Date().toISOString(),
        JSON.stringify({
          title: "Treatment Application Failed",
          body: chemicalName,
        }),
      );

      setAlerts((prev) => {
        const alerts = new Set(prev);
        alerts.add("treatmentFailed");
        return alerts;
      });
      return;
    }

    if (!status.includes("turned off")) return;

    const match = trimmed.match(/([FOT])pump/);
    const rawName = match ? pumpMap[match[1]] : "";
    const chemicalName = Object.keys(APPLICATION_QUANTITIES).find(
      (k) => k.toLowerCase() === rawName.toLowerCase(),
    ) as TreatmentType | undefined;

    if (!chemicalName) {
      console.error("Unknown treatment from BLE:", rawName);
      return;
    }

    setSessionDetails((prev) => ({ ...prev, applied: "success" }));

    userStorage.set(
      new Date().toISOString(),
      JSON.stringify({
        title: "Treatment Applied Successfully",
        body: chemicalName,
      }),
    );
    const applicationQuantity =
      APPLICATION_QUANTITIES[chemicalName as TreatmentType];

    const stored = reservoirStorage.getString(chemicalName);
    const currentCount = stored ? JSON.parse(stored) : 0;
    const newCount = currentCount + 1;

    reservoirStorage.set(chemicalName, newCount);

    const updatedQuantity =
      reservoirQuantity[chemicalName] -
      Math.round((newCount * applicationQuantity * 100) / RESERVOIR_CAPACITY);

    const threshold = (applicationQuantity * 100) / RESERVOIR_CAPACITY;

    setReservoirQuantity((prev) => ({
      ...prev,
      [chemicalName]: updatedQuantity,
    }));

    setReservoirStatus((prev) => ({
      ...prev,
      [chemicalName]: updatedQuantity < threshold ? "Empty" : "Full",
    }));

    setTreatment("success");
    setTreatmentApplied(chemicalName);
    const today = new Date();
    const d = new Date(today);
    const futureDates = getTreatmentDates(chemicalName);
    if (chemicalName == "Formic Acid") {
      d.setDate(today.getDate() + 24);
      setFoamPadRemovalDate(formatDates([d]));

      sendNotification(
        "It’s time to replace your foam pads",
        "The treatment application cycle has been completed. Please remove and discard the used foam pad and replace it with a new one.",
        24 * 24 * 60 * 60,
      );
      // schedule data sent to microcontroller
      futureDates.slice(1, 4).forEach((date, i) => {
        // scheduledTreatmentStorage.set(
        //   date.toISOString(),
        //   JSON.stringify({ treatment: "formic acid" }),
        // );
        // sendNotification(
        //   "Treatment Ready",
        //   "Open the app to apply.",
        //   (i + 1) * 6 * 24 * 60 * 60,
        // );
      });
    } else if (chemicalName == "Thymol") {
      d.setDate(today.getDate() + 28);
      setFoamPadRemovalDate(formatDates([d]));
      sendNotification(
        "It’s time to replace your foam pads",
        "The treatment application cycle has been completed. Please remove and discard the used foam pad and replace it with a new one.",
        28 * 24 * 60 * 60,
      );
      // schedule data sent to microcontroller
      // scheduledTreatmentStorage.set(
      //   futureDates[1].toISOString(),
      //   JSON.stringify({ treatment: "thymol" }),
      // );
      // sendNotification(
      //   "Treatment Ready",
      //   "Open the app to apply.",
      //   13 * 24 * 60 * 60,
      // );
    }

    setAlerts((prev) => {
      const alerts = new Set(prev);
      alerts.delete("infestationDetected");
      alerts.delete("checkComplete");
      alerts.add("treatmentComplete");
      return alerts;
    });

    // drill hole at 50 mL on reservoir, so less than 60 they should get more
    if (updatedQuantity < (60 * 100) / 500) {
      // send out notification tomorrow if reservoir has < 2 doses left
      sendNotification(
        `${chemicalName} Reservoir Low`,
        `The ${chemicalName} treatment is low and has 1 treatment remaining. Refilling will soon be required.`,
        ONE_DAY,
      );
    }
  }, [treatmentStatus, treatmentStatusTick]);
  useEffect(() => {
    alertStorage.set("alerts", JSON.stringify([...alerts]));
  }, [alerts]);
  useEffect(() => {
    userStorage.set("latestSession", JSON.stringify(sessionDetails));
  }, [sessionDetails]);
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

  async function checkScheduledTreatment() {
    const keys = scheduledTreatmentStorage
      .getAllKeys()
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    for (const key of keys) {
      const runAt = new Date(key).getTime();

      if (Date.now() >= runAt) {
        const stored = scheduledTreatmentStorage.getString(key);
        if (!stored) continue;
        setAlerts((prevAlerts) => {
          const newAlerts = new Set(prevAlerts);
          newAlerts.add("nextRoundReady");
          return newAlerts;
        });

        const { treatment } = JSON.parse(stored);

        // dont wanna send unwanted prompts to microcontroller rn
        // await sendTreatment(treatment);

        scheduledTreatmentStorage.remove(key);
      }
    }
  }

  // on app load
  useEffect(() => {
    // db
    const today = new Date();
    const loadedAlerts = alertStorage.getString("alerts");

    if (today.getMonth() <= 2 || today.getMonth() > 11) {
      // setAlerts(new Set(["treatmentFailed"]));
    } else if (loadedAlerts) {
      const loadedAlertData = JSON.parse(loadedAlerts);
      // cleaning up alerts that should collapse on app close
      setAlerts(
        new Set(
          loadedAlertData.filter(
            (a: AlertType) =>
              a != "treatmentUnavailable" &&
              a != "treatmentNotApplied" &&
              a != "treatmentComplete" &&
              a != "recommendationAvailable",
          ),
        ),
      );
    }
    const lastSessionData = userStorage.getString("latestSession");

    const parsed = lastSessionData ? JSON.parse(lastSessionData) : {};
    setLatestMiteCount(parsed.miteCount);
    if (parsed.treatment) {
      setTreatment(parsed.treatment);
    }
    if (parsed.miteCheckStatus == ("pending" as MiteCheckStatusType)) {
      setAlerts((prevAlerts) => {
        const newAlerts = new Set(prevAlerts);
        newAlerts.add("checkIncomplete");
        return newAlerts;
      });
    }
    if (parsed.date) {
      const lastDate = new Date(parsed.date);
      setLastCheckDate(lastDate);

      // difference in days
      const diffTime = today.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      setNextCheck(30 - diffDays);
      if (diffDays >= 30) {
        setAlerts((prevAlerts) => {
          const newAlerts = new Set(prevAlerts);
          newAlerts.add("checkLevels");
          return newAlerts;
        });
      }
      if (parsed.applied == "pending") {
        // infestation detected alert timeout after 7 days
        setAlerts((prevAlerts) => {
          const newAlerts = new Set(prevAlerts);
          newAlerts.delete("infestationDetected");
          return newAlerts;
        });
        if (diffDays < 7 && today.getMonth() > 3 && today.getMonth() < 11) {
          setAlerts((prevAlerts) => {
            const newAlerts = new Set(prevAlerts);
            newAlerts.add("infestationDetected");
            return newAlerts;
          });
        }
      }
    }

    // ble
    shouldScan.current = true;
    scanDevices();

    // reset state for testing
    reset("formic acid");

    // notifs
    registerForPushNotificationsAsync().then(
      (token) => token && setExpoPushToken(token),
    );

    registerBackgroundNotificationTask();
    return () => {
      shouldScan.current = false;
    }; // stops retrying on unmount
  }, []);

  useEffect(() => {
    const currentTemp = Number(temperature);

    // If we have a cached range and temp is outside it, skip storage scan
    if (tempRangeRef.current) {
      const { min, max } = tempRangeRef.current;
      if (currentTemp < min || currentTemp > max) return;
    }

    // Scan storage to build/refresh the range
    const delays = delayTreatmentStorage.getAllKeys();
    const validEntries = delays
      .map((key) => {
        const data = delayTreatmentStorage.getString(key);
        if (!data) return null;
        const parsed = JSON.parse(data);
        if (new Date(parsed.expiry) < new Date()) {
          delayTreatmentStorage.remove(key);
          return null;
        }
        return { key, ...parsed };
      })
      .filter(Boolean);

    if (validEntries.length === 0) {
      tempRangeRef.current = null;
      return;
    }

    // Cache the global range
    tempRangeRef.current = {
      min: Math.min(...validEntries.map((e) => e.minTemp)),
      max: Math.max(...validEntries.map((e) => e.maxTemp)),
    };

    if (!connectedDevice) return;

    const matching = validEntries.filter(
      (e) => e.minTemp < currentTemp && currentTemp < e.maxTemp,
    );

    if (matching.length > 0) {
      schedulePushNotification(
        "It's time to apply treatment",
        "The recommended temperature for treatment application has been reached. Open app to apply now.",
        0,
      );
      matching.forEach((e) => delayTreatmentStorage.remove(e.key));
      tempRangeRef.current = null; // invalidate cache after removal
    }
  }, [temperature, connectedDevice]);
  // when user clicks back to home
  useFocusEffect(
    useCallback(() => {
      const data = userStorage.getString("reset");
      if (data) {
        const parsed = JSON.parse(data);
        const resetVal = parsed.value;
        if (resetVal) {
          reset(parsed.treatment);
          userStorage.set(
            "reset",
            JSON.stringify({ value: false, treatment: "" }),
          );
        }
      }
    }, []),
  );
  const isOffSeason = useMemo(() => {
    const month = new Date().getMonth();
    return month < 2 || month > 11;
  }, []); // only needs to compute once per mount

  async function schedulePushNotification(
    title: string,
    body: string,
    seconds?: number,
  ) {
    console.log("sending notification");
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
      console.log("scheduled notif");
    });
  }

  async function openAppNotificationSettings() {
    await Linking.openSettings();
  }

  async function registerBackgroundNotificationTask() {
    await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
  }

  // Scans availbale BLT Devices and then call connectDevice
  async function scanDevices() {
    if (isScanning.current) return; // prevent duplicate scan loops
    isScanning.current = true;
    let connected = false;
    let retryDelay = 5000;

    async function attemptScan() {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
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

        console.log("scanning...");

        BLTManager.startDeviceScan(null, null, (error, scannedDevice) => {
          if (error) {
            console.warn(error);
            setAlerts((prevAlerts) => {
              const newAlerts = new Set(prevAlerts);
              newAlerts.add("connectionError");
              return newAlerts;
            });
          }

          if (scannedDevice && scannedDevice.name == "BLETest") {
            connected = true;
            BLTManager.stopDeviceScan();
            // console.log("RSSI at scan time:", scannedDevice.rssi);
            connectDevice(scannedDevice);
          }
        });

        // Stop scan after 5 seconds, retry if not connected

        setTimeout(() => {
          BLTManager.stopDeviceScan();
          if (!connected && shouldScan.current) {
            retryDelay = Math.min(retryDelay * 2, 60000 * 5);
            attemptScan();
          } else {
            isScanning.current = false; // reset when done
          }
        }, retryDelay);
      });
    }

    attemptScan();
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
      // if (!connectionStatus) {
      //   setIsConnected(false);
      // }
    }
  }

  // const [rssi, setRssi] = useState<number | null>(null);
  // const rssiInterval = useRef<NodeJS.Timeout | null>(null);

  // Call this after connectDevice succeeds
  // const startRSSIPolling = (deviceId: string) => {
  //   rssiInterval.current = setInterval(async () => {
  //     try {
  //       const device = await BLTManager.readRSSIForDevice(deviceId);
  //       setRssi(device.rssi);
  //       console.log("RSSI:", device.rssi);
  //     } catch (e) {
  //       console.warn("RSSI read failed:", e);
  //     }
  //   }, 1000); // every second
  // };

  // const stopRSSIPolling = () => {
  //   if (rssiInterval.current) {
  //     clearInterval(rssiInterval.current);
  //     rssiInterval.current = null;
  //   }
  // };

  //Function to send data to ESP32
  async function sendTreatment(value: string) {
    if (connectedDeviceRef.current == null) {
      setSessionDetails((sessionDetails) => ({
        ...sessionDetails,
        applied: "error" as ApplicationType,
      }));
      setTreatmentApplied(
        sessionDetails.treatment
          ? sessionDetails.treatment.replace(
              /\w\S*/g,
              (text) =>
                text.charAt(0).toUpperCase() + text.substring(1).toLowerCase(),
            )
          : "",
      );
      setTreatment("error");

      return;
    }
    // writes to microcontroller, it gets a characteristic in return from which it prints the value
    BLTManager.writeCharacteristicWithResponseForDevice(
      connectedDeviceRef.current.id,
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
        updateConnectedDevice(device);
        updateIsConnected(true);

        setAlerts((prevAlerts) => {
          const newAlerts = new Set(prevAlerts);
          newAlerts.delete("connectionError");
          return newAlerts;
        });
        return device.discoverAllServicesAndCharacteristics();
      })
      .then((device) => {
        //  Set what to do when DC is detected
        BLTManager.onDeviceDisconnected(device.id, (error, device) => {
          console.log("Device DC");
          updateIsConnected(false);
          updateConnectedDevice(undefined);
          // stopRSSIPolling();
          // if (device?.id) startRSSIPolling(device.id);

          if (shouldScan.current) {
            console.log("Restarting scan after disconnect...");
            scanDevices();
          }
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

        device
          .readCharacteristicForService(SERVICE_UUID, STATUS_UUID)
          .then((valenc) => {
            if (valenc?.value) {
              updateTreatmentStatus(
                base64.decode(valenc?.value) as TreatmentStatusType,
              );
              console.log(
                "status received",
                base64.decode(valenc?.value) as TreatmentStatusType,
              );
            }
          });

        //Treatment
        device
          .readCharacteristicForService(SERVICE_UUID, TREATMENT_UUID)
          .then((valenc) => {
            if (valenc?.value) console.log(base64.decode(valenc?.value));
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
              console.log(base64.decode(characteristic?.value));
              // now that its received an update of what the microcontroller sees, it will update
              console.log(
                "Treatment update received: ",
                base64.decode(characteristic?.value),
              );
              // setConnectedDevice(device);
              // setIsConnected(true);
            }
          },
          "treatmenttransaction",
        );

        // Status
        // Temperature
        device.monitorCharacteristicForService(
          SERVICE_UUID,
          STATUS_UUID,
          (error, characteristic) => {
            if (characteristic?.value != null) {
              updateTreatmentStatus(base64.decode(characteristic?.value));
              console.log(
                "Treatment status update received: ",
                base64.decode(characteristic?.value),
              );
              // setConnectedDevice(device);
              // setIsConnected(true);
            }
          },
          "treatmentstatustransaction",
        );

        console.log("Connection established");
      });
  }

  const verifyImage = async () => {
    if (verifyingImage) return;
    setVerifyingImage(true);
    try {
      // HOTFIX
      // setImageError(undefined);
      // showSuccessOverlay();
      // END HOTFIX
      const verificationResponse = await fetch(`${BACKEND_URL}/verifyImage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: encodedImage,
        }),
      });
      // const { data } = await api.post("/verifyImage", { image: encodedImage });
      if (verificationResponse.ok) {
        // Parse the response body as JSON
        const jsonResponse = await verificationResponse.json();
        const responseData: {
          verified: boolean;
          reason: string;
        } = jsonResponse;
        if (responseData.verified) {
          setImageError(undefined);
          showSuccessOverlay();
        } else {
          // go back to the prev screen with an error
          setImageError(responseData.reason);
          getNextStep(4);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setVerifyingImage(false);
    }
  };

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
      getNextStep(6);
    });
  };

  const closeUploadModal = () => {
    setUploadModalVisible(false);
    setNumDays(1);
    setBroodless("no");
    setSupersOn("no");
    // only bring them back to beginning if they were before the upload step
    if (uploadStep < 4) {
      setUploadStep(0);
      slideAnim.setValue(0);
      setIsAnalyzing("Start Analysis");
      setImageError(undefined);
    } else {
      setAlerts((prevAlerts) => {
        const newAlerts = new Set(prevAlerts);
        newAlerts.add("checkIncomplete");
        return newAlerts;
      });
    }
  };

  const closeTreatmentModal = () => {
    setTreatmentModalVisible(false);
    setApprovedTreatment(false);
  };

  const closeTreatmentManagementModal = () => {
    setTreatmentManagementModalVisible(false);
    setCurrentTreatmentView("Oxalic Acid");
  };

  const getNextStep = (newStep: number) => {
    if (uploadStep === newStep) return;

    const direction = newStep > uploadStep ? 1 : -1;

    Animated.timing(slideAnim, {
      toValue: -direction * width,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setUploadStep(newStep);
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
              <Text>Mite Check Results:</Text>
              <View
                style={{
                  flexDirection: "row",
                  marginBottom: 50,
                  justifyContent: "space-between",
                  gap: 16,
                }}
              >
                <View style={{ justifyContent: "space-between" }}>
                  <CircularProgress
                    size={80}
                    strokeWidth={10}
                    progress={
                      nextCheck > 0
                        ? Math.min((latestMiteCount * 100) / 12, 100)
                        : 0
                    }
                    text={nextCheck > 0 ? latestMiteCount.toString() : "Update"}
                    color={latestMiteCount > 9 ? "#FF0014" : "#3AC0A0"}
                    backgroundColor="#F0F0F0"
                    duration={1500} // animation duration
                  />
                  {nextCheck > 0 && (
                    <Text
                      style={{ color: "#949494", fontSize: 16, marginTop: 4 }}
                    >
                      Mites/Day
                    </Text>
                  )}
                </View>

                <View style={{ justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", marginBottom: 8 }}>
                    <Text style={{ fontWeight: 700 }}>Status: </Text>
                    <Text
                      style={{
                        color: `${latestMiteCount > 9 || nextCheck < 0 ? "#FF0014" : "#3AC0A0"}`,
                        fontWeight: 700,
                      }}
                    >
                      {nextCheck > 0
                        ? latestMiteCount > 9
                          ? "Infested"
                          : "Not Infested"
                        : "New Check Required"}
                    </Text>
                  </View>
                  <View style={{ maxWidth: "80%", gap: 8 }}>
                    <Text style={styles.subtitle}>
                      {nextCheck > 0
                        ? latestMiteCount > 9
                          ? "Mite levels are above the threshold, treatment is advised."
                          : "Mite levels are below the threshold, no action required."
                        : "Previous infestation check is out of date, you can view your previous status in hive history. "}
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
                  (nextCheck <= 0 || latestMiteCount <= 9) &&
                    styles.disabledButton,
                  { width: "47%", alignItems: "center" },
                ]}
                onPress={() => {
                  closeUploadModal();
                  setTreatmentModalVisible(true);
                  setTreatmentUnread(false);
                  setAlerts((prevAlerts) => {
                    const newAlerts = new Set(prevAlerts);
                    newAlerts.delete("recommendationAvailable");
                    return newAlerts;
                  });
                }}
                disabled={nextCheck <= 0 || latestMiteCount <= 9}
              >
                <Text
                  style={[
                    styles.modalButton,
                    styles.buttonText,
                    (nextCheck <= 0 || latestMiteCount <= 9) &&
                      styles.disabledButton,
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

              {imageError && (
                <AlertBanner alertType="imageNotClear" prompt={imageError} />
              )}

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
              <Text
                style={{
                  color: COLOURS.darkGrey,
                  alignSelf: "center",
                  marginBottom: 40,
                }}
              >
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
                onPress={verifyImage}
              >
                <Text
                  style={[
                    styles.modalButton,
                    styles.buttonText,
                    { backgroundColor: "transparent" },
                  ]}
                  disabled={verifyingImage}
                >
                  {verifyingImage ? "Loading..." : "Confirm"}
                </Text>
              </TouchableOpacity>
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
            <View>
              <Text
                style={{
                  borderTopColor: "#D8EAE9",
                  borderTopWidth: 1,
                  borderBottomColor: "#D8EAE9",
                  borderBottomWidth: 1,
                  paddingBlock: 10,
                }}
              >
                Questions about your hive
              </Text>

              <Text style={styles.description}>
                Before we recommend a treatment, we have a couple more questions
                about your hive’s conditions:
              </Text>

              {/* Sticky board days */}
              <View style={styles.row}>
                <Text style={styles.question}>
                  How many days has your sticky board been on?
                </Text>

                <View style={styles.counter}>
                  <TouchableOpacity
                    style={[
                      styles.circleButton,
                      numDays === 1 && styles.disabled,
                    ]}
                    onPress={() => setNumDays((d) => Math.max(0, d - 1))}
                    disabled={numDays == 1}
                  >
                    <Text
                      style={[
                        styles.circleText,
                        numDays === 1 && { color: "#C5C6CC" },
                      ]}
                    >
                      −
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.counterBox}>
                    <Text style={styles.counterText}>{numDays}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.circleButton}
                    onPress={() => setNumDays((d) => d + 1)}
                    disabled={numDays == 30}
                  >
                    <Text style={styles.circleText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Broodless */}
              <View style={styles.row}>
                <Text style={styles.question}>
                  Is your hive mostly broodless?
                </Text>

                <View style={styles.toggleRow}>
                  <ToggleButton
                    label="No"
                    selected={broodless === "no"}
                    onPress={() => setBroodless("no")}
                  />
                  <ToggleButton
                    label="Yes"
                    selected={broodless === "yes"}
                    onPress={() => setBroodless("yes")}
                  />
                </View>
              </View>

              {/* Honey supers */}
              <View style={styles.row}>
                <Text style={styles.question}>
                  Are your honey supers on currently?
                </Text>

                <View style={styles.toggleRow}>
                  <ToggleButton
                    label="No"
                    selected={supersOn === "no"}
                    onPress={() => setSupersOn("no")}
                  />
                  <ToggleButton
                    label="Yes"
                    selected={supersOn === "yes"}
                    onPress={() => setSupersOn("yes")}
                  />
                </View>
              </View>
            </View>
            {/* Buttons */}
            <View
              style={{
                marginBottom: 76,
                gap: 15,
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
                    paddingHorizontal: 5,
                  },
                ]}
                onPress={() => getNextStep(5)}
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
                    paddingHorizontal: 5,
                  },
                ]}
                onPress={() => {
                  handleStartAnalysis();
                  getNextStep(7);
                }}
              >
                <Text
                  style={[
                    styles.modalButton,
                    styles.buttonText,
                    { backgroundColor: "transparent", fontSize: 13 },
                  ]}
                  disabled={verifyingImage}
                >
                  Get Recommendation
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 7:
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
                  justifyContent: "center",
                  alignItems: "center",
                  height: "auto",
                }}
              >
                <CircularLoader
                  duration={20000}
                  isLoading={isAnalyzing != "Analysis Completed"}
                  version="detection"
                  error={isAnalyzing == "Analysis Failed"}
                  setImageModalVisible={setImageModalVisible}
                  detectionResultImageURI={detectionResultImageURI}
                  imageModalVisible={imageModalVisible}
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
                    setAlerts((prevAlerts) => {
                      const newAlerts = new Set(prevAlerts);
                      newAlerts.delete("checkLevels");
                      newAlerts.add("checkComplete");
                      newAlerts.delete("checkIncomplete");
                      return newAlerts;
                    });
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
              {treatmentApplied.replace(
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
              <View style={{ gap: 20 }}>
                <Text>
                  {`${
                    APPLICATION_QUANTITIES[
                      treatmentApplied.replace(
                        /\w\S*/g,
                        (text) =>
                          text.charAt(0).toUpperCase() +
                          text.substring(1).toLowerCase(),
                      ) as TreatmentType
                    ]
                  } mL of ${treatmentApplied.replace(
                    /\w\S*/g,
                    (text) =>
                      text.charAt(0).toUpperCase() +
                      text.substring(1).toLowerCase(),
                  )} has been applied on ${formatDates([lastCheckDate])} at ${new Date().toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}. ${treatmentApplied.toLocaleLowerCase() !== "oxalic acid" ? `The subsequent applications will dispense on ${formatDates(getTreatmentDates(treatmentApplied).slice(1, -1))}.` : ""}`}
                </Text>
                <Text>
                  {treatmentApplied.toLocaleLowerCase() == "oxalic acid"
                    ? "No further action is required."
                    : `Be sure to remove foam pads on ${foamPadRemovalDate}. We’ll notify you.`}
                </Text>
              </View>
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
              {treatmentApplied}
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
      default: // if there is a treatment
        // treatment approval screen
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
              {nextCheck <= 0 && (
                <AlertBanner alertType="recommendationExpired" />
              )}
              <Text>
                {`This treatment is recommended based on your mite check from ${lastCheckDate.toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    day: "numeric",
                  },
                )}. `}
                <Text
                  style={{ textDecorationLine: "underline" }}
                  onPress={() => {
                    closeTreatmentModal();
                    setCurrentTreatmentView(
                      treatment.replace(
                        /\w\S*/g,
                        (text) =>
                          text.charAt(0).toUpperCase() +
                          text.substring(1).toLowerCase(),
                      ) as TreatmentType,
                    );
                    setTreatmentManagementModalVisible(true);
                  }}
                >
                  Learn more about this recommendation.
                </Text>
              </Text>
              {nextCheck <= 0 ? (
                <TreatInfo style={{ alignSelf: "center" }} />
              ) : (
                <TreatmentTimeline
                  dates={getTreatmentDates(treatment)}
                  treatment={treatment.replace(
                    /\w\S*/g,
                    (text) =>
                      text.charAt(0).toUpperCase() +
                      text.substring(1).toLowerCase(),
                  )}
                />
              )}
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
                  disabled={nextCheck <= 0}
                  foamPads={treatment.toLocaleLowerCase() != "oxalic acid"}
                />
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    {
                      width: "100%",
                      alignItems: "center",
                      backgroundColor:
                        nextCheck <= 0 || !approvedTreatment
                          ? "#e0e0e0"
                          : COLOURS.colour3,
                    },
                  ]}
                  onPress={() => {
                    sendTreatment(treatment);
                  }}
                  disabled={nextCheck <= 0 || !approvedTreatment}
                >
                  <Text
                    style={[
                      styles.modalButton,
                      styles.buttonText,
                      {
                        backgroundColor: "transparent",
                        color: nextCheck <= 0 ? "#8b8b8b" : "#FFF",
                      },
                    ]}
                  >
                    Apply Treatment
                  </Text>
                </TouchableOpacity>
                {nextCheck > 0 && (
                  <Text
                    onPress={() => {
                      closeTreatmentModal();
                      setAlerts((prevAlerts) => {
                        const newAlerts = new Set(prevAlerts);
                        newAlerts.delete("checkComplete");
                        newAlerts.delete("infestationDetected");
                        newAlerts.add("treatmentNotApplied");
                        return newAlerts;
                      });
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
      maxWidth: 2650,
      maxHeight: 2650,
      quality: 0.9,
    });

    if (result.didCancel) {
      console.log("User cancelled image picker");
    } else if (result.errorCode) {
      console.log(result.errorMessage);
    } else if (result.assets && result.assets.length > 0) {
      const source = result.assets![0];
      setEncodedImage(source.base64!);
      setImageURI(source.uri);
      getNextStep(5);
    }
  };

  const handleTakePhoto = async () => {
    await Camera.requestCameraPermission();
    setShowCamera(true);
  };

  const handleStartAnalysis = async () => {
    try {
      if (isAnalyzing == "Analyzing") return;

      // Guard: no image
      if (!encodedImage) {
        console.error("No image to analyze");
        setIsAnalyzing("Analysis Failed");
        return;
      }
      const currSession = uuid.v4();
      setSessionId(currSession);

      setIsAnalyzing("Analyzing");
      setAlerts((prevAlerts) => {
        const newAlerts = new Set(prevAlerts);
        newAlerts.delete("checkLevels");
        return newAlerts;
      });

      setSessionDetails((sessionDetails) => ({
        ...sessionDetails,
        miteCheckStatus: "pending" as MiteCheckStatusType,
      }));
      // HOTFIX - comment out lines until the next setSessionDetails and add the following
      // also default it to go to the response.ok conditional block
      // setTimeout(async function () {

      //   const mite_count = 120;
      //   const infestation = true;
      //   const treatment_recommendation = "thymol";
      //   const delay = false;
      //   const temp_range: number[] = [];
      //   const annotated_image = null;
      //   console.log(mite_count)}, 5000);
      // END HOTFIX
      const response = await fetch(`${BACKEND_URL}/detectAndTreat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temperature: temperature == "" ? "20" : temperature,
          image: encodedImage.replace(/^data:[^;]+;base64,/, ""),
          overrideTreatment: treatmentToRecommend,
          numDays: numDays.toString(),
          broodless: broodless,
          supersOn: supersOn,
        }),
      });
      // const { data } = await api.post("/detectAndTreat", {
      //   temperature: temperature == "" ? "20" : temperature,
      //   image: encodedImage.replace(/^data:[^;]+;base64,/, ""),
      //   overrideTreatment: Math.random() < 0.5 ? "formic acid" : "thymol", // type in any treatment name string here, or leave it none
      //   numDays: numDays.toString(),
      //   broodless: broodless,
      //   supersOn: supersOn,
      // });
      console.log("response received");
      if (response.ok) {
        const {
          mite_count,
          infestation,
          treatment_recommendation,
          delay,
          temp_range,
          annotated_image,
        }: {
          mite_count: number;
          infestation: boolean;
          treatment_recommendation: string;
          delay: boolean;
          temp_range: number[];
          annotated_image: string;
        } = await response.json();

        setDetectionResultImageURI(annotated_image);

        setSessionDetails((prev) => ({
          ...prev,
          miteCount: mite_count,
          treatment: treatment_recommendation,
          miteCheckStatus: "success" as MiteCheckStatusType,
        }));

        setAlerts((prev) => {
          const alerts = new Set(prev);
          alerts.add("recommendationAvailable");
          if (infestation) alerts.add("infestationDetected");
          return alerts;
        });

        setTreatment(treatment_recommendation);
        setInfestation(infestation);
        setLatestMiteCount(mite_count);
        setNextCheck(30);
        setTreatmentUnread(true);
        setLastCheckDate(new Date());
        setIsAnalyzing("Analysis Completed");
        // reset for next mite check
        setNumDays(1);
        setBroodless("no");
        setSupersOn("no");
        userStorage.set(
          new Date().toISOString(),
          JSON.stringify({
            title: "Mite Check Completed",
            body: infestation
              ? "Infestation Detected"
              : "No Infestation Detected",
          }),
        );

        if (!infestation) {
          setlastNotInfested(0);
          // await schedulePushNotification(
          //   "Check Mites Levels",
          //   "It’s time for your monthly sticky board check to monitor hive health.",
          //   ONE_MONTH,
          // );
        } else if (delay && temp_range.length > 0) {
          // set a temperature tracker that expires in 30 days
          const expiryDate = new Date();
          expiryDate.setSeconds(expiryDate.getSeconds() + ONE_MONTH);
          // delayTreatmentStorage.set(
          //   treatment_recommendation,
          //   JSON.stringify({
          //     expiry: expiryDate.toISOString(),
          //     minTemp: temp_range[0],
          //     maxTemp: temp_range[1],
          //   }),
          // );
        }
      } else {
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          "handleStartAnalysis failed:",
          error.message,
          error.stack,
        );
      } else {
        console.error("handleStartAnalysis failed:", error);
      }
      setIsAnalyzing("Analysis Failed");
      closeUploadModal();
    }
  };

  useEffect(() => {
    // completed analysis but modal closed
    if (!uploadModalVisible && isAnalyzing == "Analysis Completed") {
      setAlerts((prevAlerts) => {
        const newAlerts = new Set(prevAlerts);
        newAlerts.add("checkComplete");
        newAlerts.delete("checkIncomplete");
        return newAlerts;
      });
      setUploadStep(0);
    }
  }, [uploadModalVisible, isAnalyzing]);

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
  if (showCamera)
    return (
      <StickyBoardCamera
        onPhoto={(uri, base64) => {
          setEncodedImage(base64);
          setImageURI(uri);
          setShowCamera(false);
          getNextStep(5);
        }}
        onClose={() => setShowCamera(false)}
      />
    );
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
        <Text style={styles.h1}>User</Text>
      </View>
      {/* Alerts */}
      <View>
        {[...alerts].map((a, i) => (
          <AlertBanner
            alertType={a}
            key={a}
            closeAlert={
              a == "treatmentUnavailable" || a == "connectionError"
                ? undefined
                : () =>
                    setAlerts((prevAlerts) => {
                      const newAlerts = new Set(prevAlerts);
                      newAlerts.delete(a);
                      return newAlerts;
                    })
            }
          />
        ))}
      </View>
      {/* Summary */}
      <View
        style={{
          backgroundColor: "#FFF7E6",
          borderRadius: 12,
          borderColor: COLOURS.tertiary,
          borderWidth: 3,
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
          onPressFunction={() => setUploadModalVisible(true)}
          disabled={isOffSeason}
          unread={nextCheck < 0}
        />
        <ActionButton
          text="Treatment Recommendation"
          onPressFunction={() => {
            setTreatmentUnread(false);
            setAlerts((prevAlerts) => {
              const newAlerts = new Set(prevAlerts);
              newAlerts.delete("recommendationAvailable");
              return newAlerts;
            });
            setTreatmentModalVisible(true);
          }}
          unread={treatmentUnread}
          disabled={isOffSeason}
        />
        <ActionButton
          text="Treatment Management"
          onPressFunction={() => setTreatmentManagementModalVisible(true)}
        />
        <ActionButton
          text="Resources"
          onPressFunction={() => setResourcesModalVisible(true)}
        />

        {/* Sticky Board Modal */}
        <Modal
          isVisible={uploadModalVisible}
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
              {uploadStep == 0 ? "Infestation Status" : "Scan Sticky Board"}
            </Text>

            <Animated.View
              style={{
                flex: 1,
                transform: [{ translateX: slideAnim }],
              }}
            >
              {renderStep(uploadStep)}
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
                // transform: [{ translateX: slideAnim }],
              }}
            >
              {renderTreatment()}
            </Animated.View>
          </View>
        </Modal>
        {/* Treatment Management Modal */}
        <Modal
          isVisible={treatmentManagementModalVisible}
          onBackdropPress={closeTreatmentManagementModal}
          onBackButtonPress={closeTreatmentManagementModal}
          onSwipeComplete={closeTreatmentManagementModal}
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
            <Text style={styles.title}>Treatment Management</Text>
            <Text style={[styles.subtitle]}>
              This page will show remaining treatment levels and explain when
              each treatment works best.
            </Text>
            {/* buttons */}
            <View
              style={{
                flexDirection: "row",
                borderBottomColor: "#D9D9D9",
                borderBottomWidth: 1,
                justifyContent: "space-between",
                paddingBlock: 24,
              }}
            >
              {["Oxalic Acid", "Thymol", "Formic Acid"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    currentTreatmentView == t
                      ? {
                          backgroundColor: COLOURS.colour3,
                        }
                      : { backgroundColor: "white" },
                    {
                      borderRadius: 12,
                      borderColor: "#FFEEC3",
                      borderWidth: 1,
                      boxShadow: "0px 4px 4px 0px rgba(0, 0, 0, 0.25)",
                      width: "30%",
                      height: 60,
                      alignItems: "center",
                      display: "flex",
                      justifyContent: "center",
                      paddingHorizontal: 12,
                    },
                  ]}
                  onPress={() => setCurrentTreatmentView(t as TreatmentType)}
                >
                  <Text
                    style={[
                      styles.h2,
                      currentTreatmentView == t
                        ? { color: "white" }
                        : { color: "black" },
                      { textAlign: "center" },
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* content specific to treatment */}

            <View
              style={{
                justifyContent: "space-between",
                flex: 1,
                marginTop: 24,
              }}
            >
              {/* status */}
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
                  progress={reservoirQuantity[currentTreatmentView]}
                  text={`${reservoirQuantity[currentTreatmentView]}% Full`}
                  color={COLOURS.tertiary}
                  backgroundColor="#F0F0F0"
                  duration={1500} // animation duration
                />

                <View style={{ justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", marginBottom: 8 }}>
                    <Text style={{ fontWeight: 700, fontSize: 16 }}>
                      Status:{" "}
                    </Text>
                    <Text
                      style={{
                        color: COLOURS.colour3,
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      {reservoirStatus[currentTreatmentView]}
                    </Text>
                  </View>
                  <View style={{ maxWidth: "80%", gap: 8 }}>
                    <Text style={styles.subtitle}>
                      {reservoirStatus[currentTreatmentView] == "Empty"
                        ? "The reservoir does not have enough solution for treatment. Refill is required."
                        : "The reservoir has enough solution for future treatments. No action needed."}
                    </Text>
                  </View>
                </View>
              </View>
              {/* button */}
              <TouchableOpacity
                style={{
                  flexDirection: "row",
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: COLOURS.colour3,
                  paddingBlock: 12,
                  paddingHorizontal: 5,
                }}
                onPress={() => {
                  reservoirStorage.set(currentTreatmentView, 0);
                  setReservoirQuantity((prev) => ({
                    ...prev,
                    [currentTreatmentView]: 100,
                  }));
                  setReservoirStatus((prev) => ({
                    ...prev,
                    [currentTreatmentView]: "Full",
                  }));
                  userStorage.set(
                    new Date().toISOString(),
                    JSON.stringify({
                      title: "Reservoir Refilled",
                      body: currentTreatmentView,
                    }),
                  );
                }}
              >
                <MaterialCommunityIcons
                  name="water-check"
                  size={24}
                  color={COLOURS.colour3}
                />
                <Text
                  style={{
                    marginLeft: 8,
                    fontWeight: 700,
                    color: COLOURS.colour3,
                    fontSize: 16,
                  }}
                >
                  I've refilled {currentTreatmentView}
                </Text>
              </TouchableOpacity>
              {/* text */}
              <View style={{ height: "60%", marginBlock: 10 }}>
                <Text
                  style={[styles.h2, { color: COLOURS.darkGrey, fontSize: 20 }]}
                >
                  Treatment Information:
                </Text>
                <Text style={{ marginBlock: 12 }}>
                  {currentTreatmentView == "Oxalic Acid"
                    ? "Oxalic Acid is most effective when bees are clustered but not tightly packed due to extreme cold. It works best when mites are exposed (no capped brood)."
                    : currentTreatmentView == "Formic Acid"
                      ? "Formic Acid is most effective when brood is present and mites are reproducing inside capped cells."
                      : "Thymol is most effective in warmer conditions when vaporization can occur steadily within the hive. "}
                </Text>
                <Text>
                  <Text style={{ fontWeight: 700 }}>
                    Operating Temperature:{" "}
                  </Text>
                  {currentTreatmentView == "Oxalic Acid"
                    ? "Above 4.4°C"
                    : currentTreatmentView == "Formic Acid"
                      ? "10°C - 26°C"
                      : "15°C – 30°C"}
                </Text>
                <Text style={{ marginBlock: 24 }}>
                  <Text style={{ fontWeight: 700 }}>
                    Purchasing Instructions:{" "}
                  </Text>
                  {currentTreatmentView == "Oxalic Acid"
                    ? "Buy ready mixed Oxalic acid, commercially sold as Api-Bioxal liquid."
                    : currentTreatmentView == "Formic Acid"
                      ? "Buy liquid Formic Acid  products from a verified beekeeping retailer. Follow the product label carefully to ensure proper dosage and ventilation requirements are met."
                      : "Buy liquid or gel thymol treatment products from a verified beekeeping retailer. Follow label instructions for handling. "}
                </Text>
                <Text>
                  To learn more, visit{" "}
                  <Text
                    style={{ textDecorationLine: "underline" }}
                    onPress={() =>
                      Linking.openURL(
                        "https://www.ontario.ca/page/treatment-options-honey-bee-pests-and-diseases-ontario#section-3",
                      )
                    }
                  >
                    Varroa mites
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </Modal>
        {/* Resources Modal */}
        <Modal
          isVisible={resourcesModalVisible}
          onBackdropPress={() => setResourcesModalVisible(false)}
          onBackButtonPress={() => setResourcesModalVisible(false)}
          onSwipeComplete={() => setResourcesModalVisible(false)}
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
            <ScrollView>
              <Text style={styles.title}>Resources</Text>
              <Text style={styles.subtitle}>
                View your hives detection and treatment history.
              </Text>
              <Text
                style={{
                  marginBlock: 20,
                  color: "#757575",
                  fontWeight: 500,
                  letterSpacing: 0.6,
                }}
              >
                EDUCATION
              </Text>
              <View style={{ gap: 10 }}>
                {EDUCATION.map(({ title, body, url }) => (
                  <TouchableOpacity
                    key={url}
                    onPress={() => Linking.openURL(url)}
                    style={{
                      backgroundColor: "white",
                      borderRadius: 12,
                      padding: 15,
                      boxShadow: "1px 4px 4px 0px rgba(0, 0, 0, 0.05)",
                      flexDirection: "row",
                      gap: 14,
                      overflow: "hidden",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ maxWidth: "89%" }}>
                      <Text style={{ fontWeight: 600, fontSize: 16 }}>
                        {title}
                      </Text>
                      <Text style={{ color: "#757575" }}>{body}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name="open-in-new"
                      size={20}
                      color={"#C5C6CC"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text
                style={{
                  marginBlock: 20,
                  color: "#757575",
                  fontWeight: 500,
                  letterSpacing: 0.6,
                }}
              >
                TREATMENT GUIDES
              </Text>
              <View style={{ gap: 10 }}>
                {TREATMENT.map(({ title, body, url }) => (
                  <TouchableOpacity
                    key={url}
                    onPress={() => Linking.openURL(url)}
                    style={{
                      backgroundColor: "white",
                      borderRadius: 12,
                      padding: 15,
                      boxShadow: "1px 4px 4px 0px rgba(0, 0, 0, 0.05)",
                      flexDirection: "row",
                      gap: 14,
                      overflow: "hidden",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ maxWidth: "89%" }}>
                      <Text style={{ fontWeight: 600, fontSize: 16 }}>
                        {title}
                      </Text>
                      <Text style={{ color: "#757575" }}>{body}</Text>
                    </View>
                    <MaterialCommunityIcons
                      name="open-in-new"
                      size={20}
                      color={"#C5C6CC"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}
