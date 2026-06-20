import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../lib/auth";
import { colors } from "../theme/colors";

export default function Index() {
  const { status } = useAuth();
  if (status === "loading")
    return <View className="flex-1 items-center justify-center bg-bg"><ActivityIndicator color={colors.primary} /></View>;
  return <Redirect href={status === "signedIn" ? "/(app)/profile" : "/(auth)/request-otp"} />;
}
