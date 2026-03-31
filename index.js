// import messaging from "@react-native-firebase/messaging";
import { registerRootComponent } from "expo";
import { createMMKV } from "react-native-mmkv";
import App from "./app";

export const userStorage = createMMKV({ id: "user-sessions" });
export const notificationStorage = createMMKV({ id: "notifications" });
export const alertStorage = createMMKV({ id: "alerts" });
export const reservoirStorage = createMMKV({ id: "reservoir" });
export const delayTreatmentStorage = createMMKV({ id: "delay" });
export const scheduledTreatmentStorage = createMMKV({ id: "schedule" });

registerRootComponent(App);
