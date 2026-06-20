import { useState } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
} from "react-native";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { useSelectedGroup } from "../../lib/group";
import { useMyPayments, type Payment, type PaymentStatus } from "../../lib/payments";

// ── helpers ────────────────────────────────────────────────────────────────

function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-PK", { month: "long", year: "numeric" });
}

function fmt(s: string): string {
  return "₨" + Number(s).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRowDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusChip(status: PaymentStatus): { label: string; color: string } {
  switch (status) {
    case "approved":
      return { label: "Approved", color: "text-owed" };
    case "rejected":
      return { label: "Rejected", color: "text-owe" };
    default:
      return { label: "Pending", color: "text-pending" };
  }
}

// ── ProofModal ─────────────────────────────────────────────────────────────

function ProofModal({ uri, onClose }: { uri: string; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 bg-black/90 items-center justify-center"
        onPress={onClose}
      >
        <Image
          source={{ uri }}
          className="w-full h-96"
          resizeMode="contain"
        />
        <Text className="text-white text-sm mt-4 opacity-60">Tap anywhere to close</Text>
      </Pressable>
    </Modal>
  );
}

// ── PaymentCard ────────────────────────────────────────────────────────────

function PaymentCard({ payment }: { payment: Payment }) {
  const [proofOpen, setProofOpen] = useState(false);
  const chip = statusChip(payment.status);

  return (
    <>
      <Card>
        <View className="gap-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 gap-1">
              <Text className="text-text font-bold text-lg">{fmt(payment.amount)}</Text>
              {payment.method ? (
                <Text className="text-text-muted text-xs">{payment.method}</Text>
              ) : null}
              <Text className="text-text-muted text-xs">
                {formatRowDate(payment.submitted_at)}
              </Text>
            </View>
            <View className="bg-surface border border-border rounded-full px-3 py-1">
              <Text className={`text-xs font-semibold ${chip.color}`}>{chip.label}</Text>
            </View>
          </View>

          {payment.review_note ? (
            <View className="bg-surface border border-border rounded-xl px-3 py-2">
              <Text className="text-text-muted text-xs font-semibold uppercase mb-1">
                Note
              </Text>
              <Text className="text-text text-sm">{payment.review_note}</Text>
            </View>
          ) : null}

          {payment.proof_url ? (
            <Pressable
              onPress={() => setProofOpen(true)}
              className="self-start bg-surface border border-border rounded-xl px-3 py-1"
            >
              <Text className="text-info text-xs font-semibold">View proof</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      {proofOpen && payment.proof_url && (
        <ProofModal uri={payment.proof_url} onClose={() => setProofOpen(false)} />
      )}
    </>
  );
}

// ── MyPaymentsContent ──────────────────────────────────────────────────────

function MyPaymentsContent({ groupId }: { groupId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const query = useMyPayments(groupId, year, month);
  const payments: Payment[] = query.data ?? [];

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
          <Text className="text-2xl font-bold text-text">My Payments</Text>

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
                Couldn't load payments. Check your connection and try again.
              </Text>
            </Card>
          ) : payments.length === 0 ? (
            <Card>
              <Text className="text-text-muted text-sm text-center py-4">
                No payments this month.
              </Text>
            </Card>
          ) : (
            <View className="gap-3">
              {payments.map((payment: Payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

// ── default export (gate) ──────────────────────────────────────────────────

export default function MyPaymentsScreen() {
  const { groupId } = useSelectedGroup();

  if (!groupId) {
    return (
      <Screen>
        <Card>
          <Text className="text-text font-semibold text-center py-2">
            Please select a group to view your payments.
          </Text>
        </Card>
      </Screen>
    );
  }

  return <MyPaymentsContent groupId={groupId} />;
}
