// import messaging from "@react-native-firebase/messaging";
import { registerRootComponent } from "expo";
import App from "./App";
// import { createMMKV } from "react-native-mmkv";

// export const storage = createMMKV();

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

//   await displayNotification(
//     title,
//     body,
//     `${message?.messageId}`,
//     message?.data
//   );

//   const badgeCount = message.data?.badge;
//   await addBadgeCount(badgeCount);
// }
// messaging().onMessage(onMessageReceived);
// messaging().setBackgroundMessageHandler(onMessageReceived);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
