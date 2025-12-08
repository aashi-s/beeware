import { RealmProvider } from "@realm/react";

import { Stack } from "expo-router";
import { Task } from "./schemas/Task";

export default function Layout() {
  return (
    <RealmProvider schema={[Task]}>
      <Stack />
    </RealmProvider>
  );
}
