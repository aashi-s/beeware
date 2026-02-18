// import messaging from "@react-native-firebase/messaging";
import { registerRootComponent } from "expo";
import { createMMKV } from "react-native-mmkv";
import App from "./app/(tabs)";

export const userStorage = createMMKV({ id: "user-sessions" });
export const notificationStorage = createMMKV({ id: "notifications" });

// async function onMessageReceived(message) {
//   console.log("Message received: ", message);

//   const { title, body } = message.data?.title
//     ? message.data
//     : message.notification;
//   const categoryId = `${message?.messageId}`;

//   // check if notif has already been received
//   const categoryIdStored = storage.getString("categoryId");
//   if (categoryIdStored === categoryId) {
//     return;
//   }
//   storage.set("categoryId", `${categoryId}`);
// }
registerRootComponent(App);
