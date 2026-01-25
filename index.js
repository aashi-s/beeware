// import messaging from "@react-native-firebase/messaging";
import { registerRootComponent } from "expo";
import { createMMKV } from "react-native-mmkv";
import App from "./App";

export const storage = createMMKV();

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
