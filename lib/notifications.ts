import * as Notifications from "expo-notifications";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import { api } from "./api";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

export const useNotifications = () =>
  useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get<AppNotification[]>("/notifications/")).data,
  });

export const useUnreadCount = () =>
  useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => (await api.get<{ count: number }>("/notifications/unread-count/")).data,
  });

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) =>
      (await api.post("/notifications/read/", { ids })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export async function registerForPush(): Promise<void> {
  // No-op on web
  if (Platform.OS === "web") return;

  try {
    const existingPerms = await Notifications.getPermissionsAsync();

    if (!existingPerms.granted) {
      const newPerms = await Notifications.requestPermissionsAsync();
      if (!newPerms.granted) return;
    }

    // getExpoPushTokenAsync may throw on simulators/emulators — catch it
    let token: string;
    try {
      const result = await Notifications.getExpoPushTokenAsync();
      token = result.data;
    } catch {
      // No-op on simulator or when projectId is unavailable
      return;
    }

    await api.post("/devices/", {
      expo_push_token: token,
      platform: Platform.OS,
    });
  } catch {
    // Never throw — push registration is best-effort
  }
}
