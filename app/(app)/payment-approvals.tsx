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
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { useSelectedGroup } from "../../lib/group";
import { useGroups, type GroupSummary } from "../../lib/social";
import {
  useGroupPayments,
  useApprovePayment,
  useRejectPayment,
  type Payment,
  type PaymentStatus,
} from "../../lib/payments";

// ── helpers ────────────────────────────────────────────────────────────────

function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-PK", { month: "long", year: "numeric" });
}

function fmt(s: string): string {
  return (
    "₨" +
    Number(s).toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
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

function extractDetail(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const resp = e["response"] as Record<string, unknown> | undefined;
    if (resp) {
      const data = resp["data"] as Record<string, unknown> | undefined;
      if (data?.["detail"]) return String(data["detail"]);
    }
    if (e["message"]) return String(e["message"]);
  }
  return "An unexpected error occurred.";
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
          className="w-full flex-1"
          resizeMode="contain"
        />
        <Text className="text-white text-sm mb-6 opacity-60">
          Tap anywhere to close
        </Text>
      </Pressable>
    </Modal>
  );
}

// ── ApprovalCard ───────────────────────────────────────────────────────────

function ApprovalCard({
  payment,
  groupId,
}: {
  payment: Payment;
  groupId: string;
}) {
  const [proofOpen, setProofOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const approveMutation = useApprovePayment(groupId);
  const rejectMutation = useRejectPayment(groupId);

  const chip = statusChip(payment.status);

  async function handleApprove() {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await approveMutation.mutateAsync({ id: payment.id, review_note: "" });
    } catch (err) {
      setActionError(extractDetail(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (submitting) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await rejectMutation.mutateAsync({
        id: payment.id,
        review_note: rejectNote,
      });
      setRejectOpen(false);
      setRejectNote("");
    } catch (err) {
      setActionError(extractDetail(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <View className="gap-3">
          {/* Header row */}
          <View className="flex-row items-start justify-between">
            <View className="flex-1 gap-1">
              <Text className="text-text font-bold text-base">
                {payment.user.name}
              </Text>
              <Text className="text-text font-semibold text-lg">
                {fmt(payment.amount)}
              </Text>
              <Text className="text-text-muted text-xs">
                {monthLabel(payment.year, payment.month)}
              </Text>
              {payment.method ? (
                <Text className="text-text-muted text-xs">
                  {payment.method}
                </Text>
              ) : null}
              <Text className="text-text-muted text-xs">
                Submitted: {formatRowDate(payment.submitted_at)}
              </Text>
            </View>
            <View className="bg-surface border border-border rounded-full px-3 py-1">
              <Text className={`text-xs font-semibold ${chip.color}`}>
                {chip.label}
              </Text>
            </View>
          </View>

          {/* Proof thumbnail */}
          {payment.proof_url ? (
            <Pressable
              onPress={() => setProofOpen(true)}
              className="self-start"
            >
              <Image
                source={{ uri: payment.proof_url }}
                className="w-16 h-16 rounded-xl"
                resizeMode="cover"
              />
              <Text className="text-info text-xs mt-1">Tap to enlarge</Text>
            </Pressable>
          ) : null}

          {/* Review note (if any) */}
          {payment.review_note ? (
            <View className="bg-surface border border-border rounded-xl px-3 py-2">
              <Text className="text-text-muted text-xs font-semibold uppercase mb-1">
                Note
              </Text>
              <Text className="text-text text-sm">{payment.review_note}</Text>
            </View>
          ) : null}

          {/* Reviewed by (non-submitted) */}
          {payment.status !== "submitted" && payment.reviewed_by ? (
            <Text className="text-text-muted text-xs">
              Reviewed by {payment.reviewed_by.name}
              {payment.reviewed_at
                ? ` · ${formatRowDate(payment.reviewed_at)}`
                : ""}
            </Text>
          ) : null}

          {/* Action error */}
          {actionError ? (
            <Text className="text-owe text-xs">{actionError}</Text>
          ) : null}

          {/* Approve / Reject actions — submitted only */}
          {payment.status === "submitted" ? (
            <View className="gap-2">
              {rejectOpen ? (
                <View className="gap-2">
                  <TextField
                    label="Rejection note (encouraged)"
                    value={rejectNote}
                    onChangeText={setRejectNote}
                    placeholder="Reason for rejection…"
                  />
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Button
                        label="Confirm Reject"
                        onPress={handleReject}
                        loading={rejectMutation.isPending || submitting}
                      />
                    </View>
                    <View className="flex-1">
                      <Pressable
                        onPress={() => {
                          if (submitting) return;
                          setRejectOpen(false);
                          setRejectNote("");
                          setActionError(null);
                        }}
                        className="bg-surface border border-border rounded-2xl py-4 items-center"
                      >
                        <Text className="text-text font-semibold text-base">
                          Cancel
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label="Approve"
                      onPress={handleApprove}
                      loading={approveMutation.isPending || submitting}
                    />
                  </View>
                  <View className="flex-1">
                    <Pressable
                      onPress={() => {
                        if (submitting) return;
                        setRejectOpen(true);
                      }}
                      className="bg-owe rounded-2xl py-4 items-center"
                    >
                      <Text className="text-white font-semibold text-base">
                        Reject
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </Card>

      {proofOpen && payment.proof_url ? (
        <ProofModal
          uri={payment.proof_url}
          onClose={() => setProofOpen(false)}
        />
      ) : null}
    </>
  );
}

// ── filter types ───────────────────────────────────────────────────────────

type FilterOption = PaymentStatus | "all";

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "submitted", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

// ── main content ───────────────────────────────────────────────────────────

function PaymentApprovalsContent({ groupId }: { groupId: string }) {
  const [statusFilter, setStatusFilter] = useState<FilterOption>("submitted");

  const query = useGroupPayments(
    groupId,
    statusFilter === "all" ? undefined : statusFilter,
  );
  const payments: Payment[] = query.data ?? [];

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="gap-4 pb-8">
          <Text className="text-2xl font-bold text-text">
            Payment Approvals
          </Text>

          {/* Status filter chips */}
          <View className="flex-row gap-2 flex-wrap">
            {FILTER_OPTIONS.map((opt) => {
              const active = statusFilter === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setStatusFilter(opt.value)}
                  className={`px-4 py-2 rounded-full border ${
                    active
                      ? "bg-primary border-primary"
                      : "bg-surface border-border"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? "text-white" : "text-text"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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
                No payments.
              </Text>
            </Card>
          ) : (
            <View className="gap-3">
              {payments.map((payment: Payment) => (
                <ApprovalCard
                  key={payment.id}
                  payment={payment}
                  groupId={groupId}
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

export default function PaymentApprovalsScreen() {
  const { groupId } = useSelectedGroup();
  const groupsQuery = useGroups();

  const selectedGroup: GroupSummary | undefined = groupsQuery.data?.find(
    (g: GroupSummary) => g.id === groupId,
  );

  const canManage =
    selectedGroup?.my_role === "owner" || selectedGroup?.my_role === "admin";

  if (!groupId || !selectedGroup || !canManage) {
    return (
      <Screen>
        <Card>
          <Text className="text-text font-semibold text-center py-2">
            Select a group you manage to review payments.
          </Text>
        </Card>
      </Screen>
    );
  }

  return <PaymentApprovalsContent groupId={groupId} />;
}
