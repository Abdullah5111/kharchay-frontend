import { useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import {
  useNotifications,
  useMarkRead,
  type AppNotification,
} from "../../lib/notifications";

// ── helpers ────────────────────────────────────────────────────────────────

function relativeTime(createdAt: string): string {
  const now = Date.now();
  const then = new Date(createdAt).getTime();
  const diffMs = now - then;
  if (isNaN(diffMs)) return createdAt;

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;

  const diffMo = Math.floor(diffDay / 30);
  if (diffMo < 12) return `${diffMo}mo ago`;

  return `${Math.floor(diffMo / 12)}y ago`;
}

// ── NotificationCard ───────────────────────────────────────────────────────

function NotificationCard({ notif }: { notif: AppNotification }) {
  return (
    <Card>
      <View className="flex-row items-start gap-3">
        {/* Unread dot */}
        <View className="pt-1">
          {!notif.read ? (
            <View className="w-2.5 h-2.5 rounded-full bg-primary" />
          ) : (
            <View className="w-2.5 h-2.5" />
          )}
        </View>

        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-text font-semibold text-sm flex-1 mr-2" numberOfLines={2}>
              {notif.title}
            </Text>
            <Text className="text-text-muted text-xs">
              {relativeTime(notif.created_at)}
            </Text>
          </View>
          <Text className="text-text-muted text-sm" numberOfLines={4}>
            {notif.body}
          </Text>
        </View>
      </View>
    </Card>
  );
}

// ── default export ─────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const query = useNotifications();
  const markRead = useMarkRead();

  const notifications: AppNotification[] = query.data ?? [];
  const unreadIds = notifications
    .filter((n) => !n.read)
    .map((n) => n.id);

  // After data loads, mark all unread as read (best-effort)
  useEffect(() => {
    if (unreadIds.length > 0) {
      markRead.mutate(unreadIds);
    }
    // Re-run whenever the set of unread ids changes (i.e. after data loads)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadIds.join(",")]);

  const handleMarkAllRead = () => {
    const ids = notifications.map((n) => n.id);
    if (ids.length > 0) {
      markRead.mutate(ids);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="gap-4 pb-8">
          {/* Header */}
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-text">Notifications</Text>
            {notifications.length > 0 && (
              <Pressable
                onPress={handleMarkAllRead}
                disabled={markRead.isPending}
                className="px-3 py-1 rounded-xl border border-border"
              >
                <Text className="text-text-muted text-xs font-semibold">
                  Mark all read
                </Text>
              </Pressable>
            )}
          </View>

          {/* Content */}
          {query.isLoading ? (
            <ActivityIndicator />
          ) : notifications.length === 0 ? (
            <Card>
              <Text className="text-text-muted text-sm text-center py-2">
                No notifications yet.
              </Text>
            </Card>
          ) : (
            <View className="gap-3">
              {notifications.map((notif) => (
                <NotificationCard key={notif.id} notif={notif} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
