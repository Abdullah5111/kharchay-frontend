import { Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { useSelectedGroup } from "../../lib/group";
import { useGroups, type GroupSummary } from "../../lib/social";
import type { LedgerType } from "../../lib/ledger";

type LedgerEntry = { label: string; type: LedgerType };

const LEDGERS: LedgerEntry[] = [
  { label: "Monthly Expenses", type: "monthly_expense" },
  { label: "Kitchen Expenses", type: "kitchen" },
  { label: "Workplace Items", type: "workplace" },
];

export default function ManageScreen() {
  const { groupId } = useSelectedGroup();
  const groupsQuery = useGroups();

  const selectedGroup: GroupSummary | undefined = groupsQuery.data?.find(
    (g: GroupSummary) => g.id === groupId
  );

  const canManage =
    selectedGroup?.my_role === "owner" || selectedGroup?.my_role === "admin";

  if (!groupId || !selectedGroup || !canManage) {
    return (
      <Screen>
        <Card>
          <Text className="text-text font-semibold text-center py-2">
            Select a group you manage to record expenses.
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="text-2xl font-bold text-text">Manage</Text>
      <Text className="text-text-muted text-base">{selectedGroup.name}</Text>
      <View className="gap-3">
        {LEDGERS.map((entry) => (
          <Pressable
            key={entry.type}
            onPress={() => router.push(`/(app)/ledger/${entry.type}`)}
          >
            <Card>
              <View className="flex-row justify-between items-center py-1">
                <Text className="text-text font-semibold text-base">
                  {entry.label}
                </Text>
                <Text className="text-primary text-lg font-bold">›</Text>
              </View>
            </Card>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push("/(app)/haazri")}>
          <Card>
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-text font-semibold text-base">Haazri</Text>
              <Text className="text-primary text-lg font-bold">›</Text>
            </View>
          </Card>
        </Pressable>
        <Pressable onPress={() => router.push("/(app)/settlement")}>
          <Card>
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-text font-semibold text-base">Settlement</Text>
              <Text className="text-primary text-lg font-bold">›</Text>
            </View>
          </Card>
        </Pressable>
        <Pressable onPress={() => router.push("/(app)/payment-approvals")}>
          <Card>
            <View className="flex-row justify-between items-center py-1">
              <Text className="text-text font-semibold text-base">Payment Approvals</Text>
              <Text className="text-primary text-lg font-bold">›</Text>
            </View>
          </Card>
        </Pressable>
      </View>
    </Screen>
  );
}
