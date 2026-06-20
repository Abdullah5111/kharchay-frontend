import { useState } from "react";
import { Text, View, Pressable, FlatList, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../../components/Screen";
import { Card } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { ExpenseFormModal } from "../../../components/ExpenseFormModal";
import { useSelectedGroup } from "../../../lib/group";
import { useGroup } from "../../../lib/social";
import {
  useExpenses,
  useDeleteExpense,
  usePeriods,
  useFinalizePeriod,
  useCategories,
  type LedgerType,
  type Expense,
} from "../../../lib/ledger";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function labelForType(t: LedgerType): string {
  if (t === "monthly_expense") return "Monthly Expenses";
  if (t === "kitchen") return "Kitchen Expenses";
  return "Workplace Items";
}

function prevMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function nextMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export default function LedgerScreen() {
  const params = useLocalSearchParams<{ type: string }>();
  const rawType = Array.isArray(params.type) ? params.type[0] : params.type ?? "monthly_expense";
  const ledgerType = rawType as LedgerType;

  const { groupId } = useSelectedGroup();
  const groupQuery = useGroup(groupId);
  const members = groupQuery.data?.members ?? [];
  const myRole = groupQuery.data?.my_role;
  const isAdmin = myRole === "owner" || myRole === "admin";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed
  const periodDate = `${year}-${String(month).padStart(2, "0")}-01`;

  const expensesQuery = useExpenses(groupId, ledgerType, year, month);
  const periodsQuery = usePeriods(groupId, ledgerType);
  const deleteExpense = useDeleteExpense(groupId ?? "");
  const finalizePeriod = useFinalizePeriod(groupId ?? "");

  // Category kind for resolving names in display
  const categoryKind = ledgerType === "kitchen" ? ("kitchen_pool" as const) : ledgerType;
  const categoriesQuery = useCategories(groupId, categoryKind);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);

  const currentPeriod = periodsQuery.data?.find((p: { year: number; month: number }) => p.year === year && p.month === month);
  const isFinalized = currentPeriod?.status === "finalized";
  const canWrite = isAdmin && !isFinalized;

  const goToPrev = () => {
    const p = prevMonth(year, month);
    setYear(p.year);
    setMonth(p.month);
  };

  const goToNext = () => {
    const n = nextMonth(year, month);
    setYear(n.year);
    setMonth(n.month);
  };

  const openAdd = () => {
    setEditingExpense(undefined);
    setModalVisible(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingExpense(undefined);
  };

  const doDelete = (expense: Expense) => {
    Alert.alert(
      "Delete expense",
      `Delete "${expense.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteExpense.mutate(expense.id),
        },
      ]
    );
  };

  const doFinalize = () => {
    if (!groupId) return;
    Alert.alert(
      "Finalize period",
      `Finalize ${MONTH_NAMES[month - 1]} ${year}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finalize",
          style: "destructive",
          onPress: () => finalizePeriod.mutate({ ledger: ledgerType, year, month }),
        },
      ]
    );
  };

  const resolveCategoryName = (catId: string): string => {
    const cat = categoriesQuery.data?.find((c: { id: string }) => c.id === catId);
    return cat?.name ?? catId;
  };

  const expenses = expensesQuery.data ?? [];

  return (
    <Screen>
      {/* Title row */}
      <View className="flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text">{labelForType(ledgerType)}</Text>
        {isFinalized && (
          <View className="bg-mint border border-primary rounded-full px-3 py-1">
            <Text className="text-primary-dark text-xs font-semibold">Finalized</Text>
          </View>
        )}
      </View>

      {/* Month navigation */}
      <View className="flex-row items-center justify-between bg-surface border border-border rounded-2xl px-4 py-3">
        <Pressable onPress={goToPrev} className="px-2 py-1">
          <Text className="text-primary text-lg font-bold">‹</Text>
        </Pressable>
        <Text className="text-text font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </Text>
        <Pressable onPress={goToNext} className="px-2 py-1">
          <Text className="text-primary text-lg font-bold">›</Text>
        </Pressable>
      </View>

      {/* Action buttons (admin + open period only) */}
      {canWrite && (
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Button label="+ Add Expense" onPress={openAdd} />
          </View>
          <View className="flex-1">
            <Button label="Finalize" onPress={doFinalize} loading={finalizePeriod.isPending} />
          </View>
        </View>
      )}

      {/* Expense list */}
      <FlatList
        data={expenses}
        keyExtractor={(item: Expense) => item.id}
        renderItem={({ item }: { item: Expense }) => (
          <Card>
            <View className="flex-row justify-between items-start">
              <View className="flex-1 gap-1">
                <Text className="text-text font-semibold">{item.title}</Text>
                <Text className="text-owed font-bold">PKR {item.amount}</Text>
                <Text className="text-text-muted text-sm">
                  Paid by {item.paid_by.name || item.paid_by.email}
                </Text>
                <Text className="text-text-muted text-sm">
                  {resolveCategoryName(item.category)}
                </Text>
                {item.shares.length > 0 && (
                  <Text className="text-text-muted text-sm">{item.shares.length} share{item.shares.length !== 1 ? "s" : ""}</Text>
                )}
              </View>
              {canWrite && (
                <View className="gap-2 ml-3">
                  <Pressable
                    onPress={() => openEdit(item)}
                    className="bg-mint-bg border border-primary rounded-xl px-3 py-1"
                  >
                    <Text className="text-primary-dark text-sm">Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => doDelete(item)}
                    className="bg-surface border border-border rounded-xl px-3 py-1"
                  >
                    <Text className="text-owe text-sm">Delete</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          expensesQuery.isLoading
            ? <Text className="text-text-muted text-center mt-4">Loading...</Text>
            : <Text className="text-text-muted text-center mt-4">No expenses for this period.</Text>
        }
        contentContainerClassName="gap-2"
      />

      {/* Form modal */}
      {groupId && (
        <ExpenseFormModal
          visible={modalVisible}
          onClose={closeModal}
          groupId={groupId}
          ledgerType={ledgerType}
          members={members}
          expense={editingExpense}
          periodDate={periodDate}
        />
      )}
    </Screen>
  );
}
