import { useState, useEffect } from "react";
import { Modal, View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { TextField } from "./TextField";
import { AmountInput } from "./AmountInput";
import { MemberMultiSelect } from "./MemberMultiSelect";
import { CategoryPicker } from "./CategoryPicker";
import { Button } from "./Button";
import {
  useCategories,
  useCreateCategory,
  useCreateExpense,
  useUpdateExpense,
  type LedgerType,
  type CategoryKind,
  type Expense,
} from "../lib/ledger";
import type { Member } from "../lib/social";

type Props = {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  ledgerType: LedgerType;
  members: Member[];
  expense?: Expense;
  periodDate: string;
};

type SplitType = "equal" | "custom";

function kindFromType(t: LedgerType): CategoryKind {
  return t === "kitchen" ? "kitchen_pool" : t;
}

export function ExpenseFormModal({ visible, onClose, groupId, ledgerType, members, expense, periodDate }: Props) {
  const isEdit = !!expense;
  const isKitchen = ledgerType === "kitchen";

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [involved, setInvolved] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [splitError, setSplitError] = useState("");

  const kind = kindFromType(ledgerType);
  const categories = useCategories(groupId, kind);
  const createCategory = useCreateCategory(groupId);
  const createExpense = useCreateExpense(groupId);
  const updateExpense = useUpdateExpense(groupId);

  // Pre-fill when editing
  useEffect(() => {
    if (visible && expense) {
      setTitle(expense.title);
      setAmount(expense.amount);
      setPaidBy(expense.paid_by.id);
      setCategoryId(expense.category);
      if (!isKitchen) {
        const st: SplitType = expense.split_type === "custom" ? "custom" : "equal";
        setSplitType(st);
        if (st === "equal") {
          setInvolved(expense.shares.map((s) => s.user.id));
        } else {
          const ca: Record<string, string> = {};
          expense.shares.forEach((s) => { ca[s.user.id] = s.amount; });
          setCustomAmounts(ca);
          setInvolved(expense.shares.map((s) => s.user.id));
        }
      }
    } else if (visible && !expense) {
      // Reset for add mode
      setTitle("");
      setAmount("");
      setPaidBy(null);
      setCategoryId(null);
      setSplitType("equal");
      setInvolved([]);
      setCustomAmounts({});
    }
    setError("");
    setSplitError("");
  }, [visible, expense, isKitchen]);

  const toggleInvolved = (id: string) => {
    setInvolved((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setCustomAmount = (userId: string, val: string) => {
    setCustomAmounts((prev) => ({ ...prev, [userId]: val.replace(/[^0-9.]/g, "") }));
  };

  const validate = (): boolean => {
    setSplitError("");
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError("Amount must be greater than 0."); return false; }
    if (!categoryId) { setError("Please select a category."); return false; }
    if (!paidBy) { setError("Please select who paid."); return false; }
    if (!isKitchen) {
      if (splitType === "equal") {
        if (involved.length === 0) { setError("Select at least one member for the split."); return false; }
      } else {
        // custom: sum must equal total
        const sum = involved.reduce((acc, id) => {
          const v = parseFloat(customAmounts[id] ?? "0");
          return acc + (isNaN(v) ? 0 : v);
        }, 0);
        // allow small float epsilon
        if (Math.abs(sum - amt) > 0.01) {
          setSplitError(`Custom shares sum (${sum.toFixed(2)}) must equal total (${amt.toFixed(2)}).`);
          return false;
        }
      }
    }
    setError("");
    return true;
  };

  const buildBody = (): Record<string, unknown> => {
    const base: Record<string, unknown> = {
      title: title.trim(),
      amount,
      paid_by: paidBy,
      category: categoryId,
      ledger_type: ledgerType,
      date: expense ? expense.date : periodDate,
    };
    if (!isKitchen) {
      base.split_type = splitType;
      if (splitType === "equal") {
        base.involved = involved;
      } else {
        base.shares = involved.map((id) => ({ user: id, amount: customAmounts[id] ?? "0" }));
      }
    }
    return base;
  };

  const submit = async () => {
    if (!validate()) return;
    try {
      const body = buildBody();
      if (isEdit) {
        await updateExpense.mutateAsync({ id: expense!.id, body });
      } else {
        await createExpense.mutateAsync(body);
      }
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail ?? "Something went wrong.");
    }
  };

  const isPending = createExpense.isPending || updateExpense.isPending;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-6 pt-8 pb-12 gap-5">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-xl font-bold text-text">
            {isEdit ? "Edit Expense" : "Add Expense"}
          </Text>
          <Pressable onPress={onClose} className="px-3 py-2 rounded-xl bg-surface border border-border">
            <Text className="text-text-muted">Cancel</Text>
          </Pressable>
        </View>

        {/* Title */}
        <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Groceries" />

        {/* Amount */}
        <AmountInput value={amount} onChangeText={setAmount} />

        {/* Paid by */}
        <View className="gap-2">
          <Text className="text-text-muted text-sm">Paid by</Text>
          <View className="flex-row flex-wrap gap-2">
            {members.map((m) => {
              const on = paidBy === m.user.id;
              return (
                <Pressable
                  key={m.user.id}
                  onPress={() => setPaidBy(m.user.id)}
                  className={`px-3 py-2 rounded-full border ${on ? "bg-mint border-primary" : "bg-surface border-border"}`}
                >
                  <Text className={on ? "text-primary-dark" : "text-text-muted"}>
                    {m.user.name || m.user.email}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Category */}
        <CategoryPicker
          categories={categories.data ?? []}
          value={categoryId}
          onChange={setCategoryId}
          onAdd={(name) => createCategory.mutateAsync({ ledger_type: kind, name })}
          kind={kind}
        />

        {/* Split UI — non-kitchen only */}
        {!isKitchen && (
          <View className="gap-3">
            {/* Toggle */}
            <View className="gap-2">
              <Text className="text-text-muted text-sm">Split type</Text>
              <View className="flex-row gap-2">
                {(["equal", "custom"] as SplitType[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setSplitType(t)}
                    className={`px-4 py-2 rounded-full border ${splitType === t ? "bg-mint border-primary" : "bg-surface border-border"}`}
                  >
                    <Text className={splitType === t ? "text-primary-dark font-semibold" : "text-text-muted"}>
                      {t === "equal" ? "Equal" : "Custom"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {splitType === "equal" && (
              <MemberMultiSelect members={members} selected={involved} onToggle={toggleInvolved} />
            )}

            {splitType === "custom" && (
              <View className="gap-2">
                <Text className="text-text-muted text-sm">Per-member amounts</Text>
                {members.map((m) => {
                  const isIncluded = involved.includes(m.user.id);
                  return (
                    <View key={m.user.id} className="flex-row items-center gap-3">
                      <Pressable
                        onPress={() => toggleInvolved(m.user.id)}
                        className={`w-6 h-6 rounded border items-center justify-center ${isIncluded ? "bg-primary border-primary" : "bg-surface border-border"}`}
                      >
                        {isIncluded && <Text className="text-white text-xs font-bold">✓</Text>}
                      </Pressable>
                      <Text className="text-text flex-1">{m.user.name || m.user.email}</Text>
                      {isIncluded && (
                        <TextInput
                          value={customAmounts[m.user.id] ?? ""}
                          onChangeText={(v) => setCustomAmount(m.user.id, v)}
                          keyboardType="decimal-pad"
                          placeholder="0.00"
                          className="bg-surface border border-border rounded-xl px-3 py-2 text-text w-28 text-right"
                        />
                      )}
                    </View>
                  );
                })}
                {splitError ? <Text className="text-owe text-sm">{splitError}</Text> : null}
              </View>
            )}
          </View>
        )}

        {/* General error */}
        {error ? <Text className="text-owe text-sm">{error}</Text> : null}

        {/* Submit */}
        <Button label={isEdit ? "Save changes" : "Add expense"} onPress={submit} loading={isPending} />
      </ScrollView>
    </Modal>
  );
}
