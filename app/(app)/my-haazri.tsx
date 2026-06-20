import { useState } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { TextField } from "../../components/TextField";
import { useSelectedGroup } from "../../lib/group";
import { useMyHaazri, useRaiseDispute, type MyHaazriRow } from "../../lib/haazri";

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

// ── DisputeModal ───────────────────────────────────────────────────────────

function DisputeModal({
  attendanceId,
  onClose,
}: {
  attendanceId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const raiseDispute = useRaiseDispute(attendanceId);

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Please enter a reason for the dispute.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await raiseDispute.mutateAsync({ reason: trimmed });
      setDone(true);
    } catch (err) {
      setError(extractDetail(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-bg rounded-t-3xl p-6 gap-4">
          <Text className="text-text text-lg font-bold">Raise Dispute</Text>

          {done ? (
            <>
              <Text className="text-primary text-sm">
                Dispute submitted successfully.
              </Text>
              <Button label="Close" onPress={onClose} />
            </>
          ) : (
            <>
              <TextField
                label="Reason"
                value={reason}
                onChangeText={setReason}
                placeholder="Describe why you are disputing this attendance…"
                autoFocus
              />

              {error && (
                <Text className="text-owe text-sm">{error}</Text>
              )}

              <View className="flex-row gap-3">
                <Pressable
                  onPress={onClose}
                  className="flex-1 py-4 rounded-2xl border border-border items-center"
                >
                  <Text className="text-text-muted font-semibold">Cancel</Text>
                </Pressable>
                <View className="flex-1">
                  <Button
                    label="Submit"
                    onPress={handleSubmit}
                    loading={submitting}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── HaazriRow ──────────────────────────────────────────────────────────────

function HaazriRowCard({ row }: { row: MyHaazriRow }) {
  const [disputeOpen, setDisputeOpen] = useState(false);
  const label = row.category_name || "Meal";

  return (
    <>
      <Card>
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1 gap-1">
            <Text className="text-text font-semibold text-base">{label}</Text>
            <Text className="text-text-muted text-xs">
              {formatRowDate(row.date)}
              {row.multiplier > 1 && (
                <Text className="text-primary"> ×{row.multiplier}</Text>
              )}
            </Text>
            {row.guest_label ? (
              <Text className="text-text-muted text-xs">
                Guest: {row.guest_label}
              </Text>
            ) : null}
          </View>

          <View className="items-end gap-2">
            <Pressable
              onPress={() => setDisputeOpen(true)}
              className="bg-surface border border-border rounded-xl px-3 py-1"
            >
              <Text className="text-owe text-xs font-semibold">Dispute</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      {disputeOpen && (
        <DisputeModal
          attendanceId={row.attendance_id}
          onClose={() => setDisputeOpen(false)}
        />
      )}
    </>
  );
}

// ── MyHaazriContent ────────────────────────────────────────────────────────

function MyHaazriContent({ groupId }: { groupId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const query = useMyHaazri(groupId, year, month);
  const rows: MyHaazriRow[] = query.data ?? [];

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
          <Text className="text-2xl font-bold text-text">My Haazri</Text>

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
          ) : rows.length === 0 ? (
            <Card>
              <Text className="text-text-muted text-sm text-center py-2">
                No attendance records for this month.
              </Text>
            </Card>
          ) : (
            <View className="gap-3">
              {rows.map((row) => (
                <HaazriRowCard key={row.attendance_id} row={row} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

// ── default export (gate) ──────────────────────────────────────────────────

export default function MyHaazriScreen() {
  const { groupId } = useSelectedGroup();

  if (!groupId) {
    return (
      <Screen>
        <Card>
          <Text className="text-text font-semibold text-center py-2">
            Please select a group to view your Haazri history.
          </Text>
        </Card>
      </Screen>
    );
  }

  return <MyHaazriContent groupId={groupId} />;
}
