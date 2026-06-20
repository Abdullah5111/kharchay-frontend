import { useState } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { useSelectedGroup } from "../../lib/group";
import { useActivity, type ActivityItem } from "../../lib/settlement";

// ── helpers ────────────────────────────────────────────────────────────────

function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-PK", { month: "long", year: "numeric" });
}

function formatRowDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function fmt(s: string): string {
  return "₨" + Number(s).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── ActivityRow ────────────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  // Kind chip label: guard optional fields — never render undefined
  const chipLabel =
    item.kind === "expense"
      ? capitalize(item.ledger_type ?? "expense")
      : item.pool_name ?? "Meal";

  return (
    <Card>
      <View className="flex-row items-start justify-between gap-2">
        {/* Left: title + date */}
        <View className="flex-1 gap-1">
          <Text className="text-text font-semibold text-base">{item.title}</Text>
          <Text className="text-text-muted text-xs">{formatRowDate(item.date)}</Text>

          {/* Kind chip + role tag */}
          <View className="flex-row items-center gap-2 mt-1">
            <View className="bg-mint-bg rounded-full px-2 py-0.5">
              <Text className="text-primary text-xs font-medium">{chipLabel}</Text>
            </View>
            {item.role === "payer" ? (
              <Text className="text-primary text-xs font-medium">Paid by you</Text>
            ) : (
              <Text className="text-text-muted text-xs">Your share</Text>
            )}
          </View>
        </View>

        {/* Right: amount */}
        <Text className="text-text font-semibold text-base">{fmt(item.amount)}</Text>
      </View>
    </Card>
  );
}

// ── ActivityContent ────────────────────────────────────────────────────────

function ActivityContent({ groupId }: { groupId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const query = useActivity(groupId, year, month);
  const items: ActivityItem[] = query.isError ? [] : (query.data ?? []);

  const handlePrev = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNext = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="gap-4 pb-8">
          <Text className="text-2xl font-bold text-text">Activity</Text>

          {/* Month selector */}
          <Card>
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={handlePrev}
                className="px-4 py-2 rounded-xl border border-border"
              >
                <Text className="text-text font-semibold text-base">‹</Text>
              </Pressable>
              <Text className="text-text font-semibold text-base">
                {monthLabel(year, month)}
              </Text>
              <Pressable
                onPress={handleNext}
                className="px-4 py-2 rounded-xl border border-border"
              >
                <Text className="text-text font-semibold text-base">›</Text>
              </Pressable>
            </View>
          </Card>

          {/* Content */}
          {query.isLoading ? (
            <ActivityIndicator />
          ) : query.isError ? (
            <Card>
              <Text className="text-owe text-sm text-center py-2">
                Couldn't load your activity.
              </Text>
            </Card>
          ) : items.length === 0 ? (
            <Card>
              <Text className="text-text-muted text-sm text-center py-2">
                No activity this month.
              </Text>
            </Card>
          ) : (
            <View className="gap-3">
              {items.map((item: ActivityItem, index: number) => (
                <ActivityRow
                  key={`${item.kind}-${item.date}-${index}`}
                  item={item}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

// ── default export (gate) ──────────────────────────────────────────────────

export default function ActivityScreen() {
  const { groupId } = useSelectedGroup();

  if (!groupId) {
    return (
      <Screen>
        <Card>
          <Text className="text-text font-semibold text-center py-2">
            Please select a group to view your activity.
          </Text>
        </Card>
      </Screen>
    );
  }

  return <ActivityContent groupId={groupId} />;
}
