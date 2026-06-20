import { useEffect } from "react";
import { Redirect, Tabs } from "expo-router";
import { useAuth } from "../../lib/auth";
import { SelectedGroupProvider } from "../../lib/group";
import { colors } from "../../theme/colors";
import { registerForPush } from "../../lib/notifications";

function AppLayoutInner() {
  useEffect(() => {
    registerForPush();
  }, []);

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerShown: false }}>
      <Tabs.Screen name="groups" options={{ title: "Groups" }} />
      <Tabs.Screen name="friends" options={{ title: "Friends" }} />
      <Tabs.Screen name="manage" options={{ title: "Manage" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="group/[id]" options={{ href: null }} />
      <Tabs.Screen name="ledger/[type]" options={{ href: null }} />
      <Tabs.Screen name="haazri" options={{ href: null }} />
      <Tabs.Screen name="my-haazri" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}

export default function AppLayout() {
  const { status } = useAuth();
  if (status === "loading") return null;
  if (status !== "signedIn") return <Redirect href="/(auth)/request-otp" />;
  return (
    <SelectedGroupProvider>
      <AppLayoutInner />
    </SelectedGroupProvider>
  );
}
