import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth";
import { Screen } from "../../components/Screen";
import { Button } from "../../components/Button";
import { useSelectedGroup } from "../../lib/group";
import { useGroups, type GroupSummary } from "../../lib/social";
import { useUnreadCount } from "../../lib/notifications";

export default function Profile() {
  const { user, signOut } = useAuth();
  const [mode, setMode] = useState<"mine" | "manage">("mine");
  const { groupId } = useSelectedGroup();
  const { data: groups } = useGroups();
  const { data: unreadData } = useUnreadCount();

  const selectedGroup: GroupSummary | null = groups?.find((g: GroupSummary) => g.id === groupId) ?? null;
  const groupName = selectedGroup?.name ?? "No group selected";
  const role = selectedGroup?.my_role ?? null;
  const canManage = role === "owner" || role === "admin";

  const unreadCount = unreadData?.count ?? 0;

  const doSignOut = async () => {
    try { await signOut(); } catch {}
    router.replace("/(auth)/request-otp");
  };

  return (
    <Screen>
      <Text className="text-2xl font-bold text-text">Hi, {user?.name || "there"}</Text>
      <Text className="text-text-muted">{user?.email ?? ""}</Text>

      <View className="mt-4 bg-surface rounded-2xl p-4 border border-border">
        <Text className="text-xs text-text-muted mb-1">Selected Group</Text>
        <Text className="text-base font-semibold text-text">{groupName}</Text>
        <Text className="text-xs text-text-muted capitalize mt-1">{role ?? "—"}</Text>
      </View>

      <View className="flex-row bg-mint-bg rounded-2xl p-1 mt-4">
        <Pressable
          onPress={() => setMode("mine")}
          className={`flex-1 py-3 rounded-xl items-center ${mode === "mine" ? "bg-primary" : ""}`}
        >
          <Text className={mode === "mine" ? "text-white font-semibold" : "text-text-muted"}>
            My Expenses
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { if (canManage) setMode("manage"); }}
          className={`flex-1 py-3 rounded-xl items-center ${mode === "manage" ? "bg-primary" : ""} ${!canManage ? "opacity-40" : ""}`}
        >
          <Text className={mode === "manage" ? "text-white font-semibold" : "text-text-muted"}>
            Management
          </Text>
        </Pressable>
      </View>

      {/* Quick-nav links */}
      <View className="bg-surface rounded-2xl border border-border overflow-hidden">
        <Pressable
          onPress={() => router.push("/(app)/my-haazri")}
          className="flex-row items-center justify-between px-4 py-4 border-b border-border"
        >
          <Text className="text-text font-medium">My Haazri</Text>
          <Text className="text-text-muted text-base">›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(app)/standing")}
          className="flex-row items-center justify-between px-4 py-4 border-b border-border"
        >
          <Text className="text-text font-medium">My Standing</Text>
          <Text className="text-text-muted text-base">›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(app)/my-payments")}
          className="flex-row items-center justify-between px-4 py-4 border-b border-border"
        >
          <Text className="text-text font-medium">My Payments</Text>
          <Text className="text-text-muted text-base">›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(app)/activity")}
          className="flex-row items-center justify-between px-4 py-4 border-b border-border"
        >
          <Text className="text-text font-medium">Activity</Text>
          <Text className="text-text-muted text-base">›</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/(app)/notifications")}
          className="flex-row items-center justify-between px-4 py-4"
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-text font-medium">Notifications</Text>
            {unreadCount > 0 && (
              <View className="bg-primary rounded-full min-w-5 h-5 items-center justify-center px-1">
                <Text className="text-white text-xs font-bold">
                  {unreadCount > 99 ? "99+" : String(unreadCount)}
                </Text>
              </View>
            )}
          </View>
          <Text className="text-text-muted text-base">›</Text>
        </Pressable>
      </View>

      <View className="flex-1" />
      <Button label="Sign out" onPress={doSignOut} />
    </Screen>
  );
}
