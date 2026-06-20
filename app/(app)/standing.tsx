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
import { Button } from "../../components/Button";
import { SubmitPaymentModal } from "../../components/SubmitPaymentModal";
import { useSelectedGroup } from "../../lib/group";
import { useAuth } from "../../lib/auth";
import { useMyStanding, type Standing, type SettlementTransfer } from "../../lib/settlement";
import { useMyPayments, type Payment } from "../../lib/payments";

// ── helpers ────────────────────────────────────────────────────────────────

function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-PK", { month: "long", year: "numeric" });
}

function fmt(s: string | number): string {
  const n = typeof s === "string" ? Number(s) : s;
  return "₨" + n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusLabel(status: Standing["settlement_status"]): string {
  if (status === "none") return "Not yet generated";
  if (status === "draft") return "Draft settlement";
  return "Finalized";
}

function statusColor(status: Standing["settlement_status"]): string {
  if (status === "finalized") return "text-primary";
  if (status === "draft") return "text-text-muted";
  return "text-text-muted";
}

// ── TransferRow ────────────────────────────────────────────────────────────

function TransferRow({
  transfer,
  currentUserId,
}: {
  transfer: SettlementTransfer;
  currentUserId: string;
}) {
  const isDebtor = transfer.from_user.id === currentUserId;
  const isCreditor = transfer.to_user.id === currentUserId;

  if (isDebtor) {
    return (
      <View className="flex-row items-center justify-between py-3 border-b border-border last:border-b-0">
        <Text className="text-text text-sm flex-1">
          Pay{" "}
          <Text className="font-semibold">{transfer.to_user.name}</Text>
        </Text>
        <Text className="text-owe font-bold text-sm">{fmt(transfer.amount)}</Text>
      </View>
    );
  }

  if (isCreditor) {
    return (
      <View className="flex-row items-center justify-between py-3 border-b border-border last:border-b-0">
        <Text className="text-text text-sm flex-1">
          <Text className="font-semibold">{transfer.from_user.name}</Text> pays
          you
        </Text>
        <Text className="text-owed font-bold text-sm">{fmt(transfer.amount)}</Text>
      </View>
    );
  }

  return null;
}

// ── StandingContent ────────────────────────────────────────────────────────

function StandingContent({ groupId }: { groupId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const { user } = useAuth();

  const query = useMyStanding(groupId, year, month);
  const data = query.data;

  // Payments query — failing should NOT break standing screen
  const paymentsQuery = useMyPayments(groupId, year, month);
  const payments: Payment[] = paymentsQuery.data ?? [];

  // Compute approved paid and pending paid
  const approvedPaid = payments
    .filter((p: Payment) => p.status === "approved")
    .reduce((sum: number, p: Payment) => sum + Number(p.amount), 0);
  const pendingPaid = payments
    .filter((p: Payment) => p.status === "submitted")
    .reduce((sum: number, p: Payment) => sum + Number(p.amount), 0);

  const net = data ? Number(data.net) : 0;
  const remaining = net > 0 ? Math.max(0, net - approvedPaid) : 0;

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

  // Determine if truly empty
  const isEmptyMonth =
    data &&
    data.settlement_status === "none" &&
    Number(data.net) === 0 &&
    data.breakdown.non_kitchen.length === 0 &&
    data.breakdown.kitchen.length === 0 &&
    data.breakdown.extras.length === 0 &&
    data.breakdown.paid.length === 0;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="gap-4 pb-8">
          <Text className="text-2xl font-bold text-text">My Standing</Text>

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
                Couldn't load your standing. Pull to retry or check your connection.
              </Text>
            </Card>
          ) : !data ? (
            <Card>
              <Text className="text-text-muted text-sm text-center py-2">
                Could not load standing data.
              </Text>
            </Card>
          ) : isEmptyMonth ? (
            <Card>
              <Text className="text-text-muted text-sm text-center py-4">
                No activity this month yet.
              </Text>
            </Card>
          ) : (
            <>
              {/* Hero card */}
              <Card>
                <View className="items-center gap-2 py-2">
                  {net > 0 ? (
                    <Text className="text-owe text-3xl font-bold">
                      You owe {fmt(data.net)}
                    </Text>
                  ) : net < 0 ? (
                    <Text className="text-owed text-3xl font-bold">
                      You are owed {fmt(String(-net))}
                    </Text>
                  ) : (
                    <Text className="text-text text-3xl font-bold">
                      You're all settled
                    </Text>
                  )}
                  <Text className="text-text-muted text-sm">
                    Paid {fmt(data.paid_total)} · Owed {fmt(data.owed_total)}
                  </Text>
                  <View className="bg-surface border border-border rounded-full px-3 py-1 mt-1">
                    <Text className={`text-xs font-medium ${statusColor(data.settlement_status)}`}>
                      {statusLabel(data.settlement_status)}
                    </Text>
                  </View>
                </View>
              </Card>

              {/* Payment section — only shown when user owes money */}
              {net > 0 && (
                <Card>
                  <View className="gap-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-text font-semibold text-base">Payments</Text>
                    </View>
                    <View className="flex-row items-center justify-between py-2 border-b border-border">
                      <Text className="text-text text-sm">Remaining after payments</Text>
                      <Text className="text-owe font-bold text-sm">{fmt(String(remaining))}</Text>
                    </View>
                    {pendingPaid > 0 && (
                      <View className="flex-row items-center justify-between py-2 border-b border-border">
                        <Text className="text-text text-sm">Pending approval</Text>
                        <Text className="text-pending font-semibold text-sm">{fmt(String(pendingPaid))}</Text>
                      </View>
                    )}
                    <Button
                      label="Submit Payment"
                      onPress={() => setPaymentModalOpen(true)}
                    />
                  </View>
                </Card>
              )}

              {/* Transfers section */}
              {data.transfers.length > 0 && user && (
                <Card>
                  <Text className="text-text font-semibold text-base mb-2">
                    Transfers
                  </Text>
                  {data.transfers.map((t: SettlementTransfer, i: number) => (
                    <TransferRow
                      key={i}
                      transfer={t}
                      currentUserId={user.id}
                    />
                  ))}
                </Card>
              )}

              {/* Breakdown section */}
              <Card>
                <Text className="text-text font-semibold text-base mb-3">
                  Breakdown
                </Text>

                {/* Non-kitchen */}
                {data.breakdown.non_kitchen.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-text-muted text-xs font-semibold uppercase mb-2">
                      Expenses
                    </Text>
                    {data.breakdown.non_kitchen.map((item: { ledger_type: string; category_name: string; amount: string }, i: number) => (
                      <View
                        key={i}
                        className="flex-row items-center justify-between py-2 border-b border-border last:border-b-0"
                      >
                        <View className="flex-1">
                          <Text className="text-text text-sm">{item.category_name}</Text>
                          <Text className="text-text-muted text-xs capitalize">{item.ledger_type}</Text>
                        </View>
                        <Text className="text-text-muted text-sm">{fmt(item.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Kitchen */}
                {data.breakdown.kitchen.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-text-muted text-xs font-semibold uppercase mb-2">
                      Kitchen
                    </Text>
                    {data.breakdown.kitchen.map((item: { pool_name: string; units: number; rate: string; amount: string }, i: number) => (
                      <View
                        key={i}
                        className="flex-row items-center justify-between py-2 border-b border-border last:border-b-0"
                      >
                        <View className="flex-1">
                          <Text className="text-text text-sm">{item.pool_name}</Text>
                          <Text className="text-text-muted text-xs">
                            {item.units}u × {fmt(item.rate)}
                          </Text>
                        </View>
                        <Text className="text-text-muted text-sm">{fmt(item.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Extras */}
                {data.breakdown.extras.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-text-muted text-xs font-semibold uppercase mb-2">
                      Extras
                    </Text>
                    {data.breakdown.extras.map((item: { pool_name: string; date: string; title: string; amount: string }, i: number) => (
                      <View
                        key={i}
                        className="flex-row items-center justify-between py-2 border-b border-border last:border-b-0"
                      >
                        <View className="flex-1">
                          <Text className="text-text text-sm">{item.title}</Text>
                          <Text className="text-text-muted text-xs">
                            {item.pool_name} · {item.date}
                          </Text>
                        </View>
                        <Text className="text-text-muted text-sm">{fmt(item.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Paid */}
                {data.breakdown.paid.length > 0 && (
                  <View>
                    <Text className="text-text-muted text-xs font-semibold uppercase mb-2">
                      You Paid
                    </Text>
                    {data.breakdown.paid.map((item: { label: string; ledger_type: string; amount: string }, i: number) => (
                      <View
                        key={i}
                        className="flex-row items-center justify-between py-2 border-b border-border last:border-b-0"
                      >
                        <View className="flex-1">
                          <Text className="text-text text-sm">{item.label}</Text>
                          <Text className="text-text-muted text-xs capitalize">{item.ledger_type}</Text>
                        </View>
                        <Text className="text-owed text-sm">{fmt(item.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {data.breakdown.non_kitchen.length === 0 &&
                  data.breakdown.kitchen.length === 0 &&
                  data.breakdown.extras.length === 0 &&
                  data.breakdown.paid.length === 0 && (
                    <Text className="text-text-muted text-sm text-center py-2">
                      No breakdown data available.
                    </Text>
                  )}
              </Card>
            </>
          )}
        </View>
      </ScrollView>

      {paymentModalOpen && (
        <SubmitPaymentModal
          groupId={groupId}
          year={year}
          month={month}
          onClose={() => setPaymentModalOpen(false)}
        />
      )}
    </Screen>
  );
}

// ── default export (gate) ──────────────────────────────────────────────────

export default function StandingScreen() {
  const { groupId } = useSelectedGroup();

  if (!groupId) {
    return (
      <Screen>
        <Card>
          <Text className="text-text font-semibold text-center py-2">
            Please select a group to view your standing.
          </Text>
        </Card>
      </Screen>
    );
  }

  return <StandingContent groupId={groupId} />;
}
