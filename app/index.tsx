import { useEffect } from "react";
// import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function Index() {
  useEffect(() => {
    const check = async () => {
      //   const done = await AsyncStorage.getItem("onboardingComplete");

      // wait a tick so router is ready
      setTimeout(() => {
        // if (done === "true") {
        //   router.replace("/(tabs)");
        // } else {
        router.replace("/(onboarding)");
        // }
      }, 0);
    };

    check();
  }, []);

  return null;
}
