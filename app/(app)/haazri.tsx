import { useState, useCallback } from "react";
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
import { AmountInput } from "../../components/AmountInput";
import { MultiplierStepper } from "../../components/MultiplierStepper";
import { CategoryPicker } from "../../components/CategoryPicker";
import { useSelectedGroup } from "../../lib/group";
import { useGroups, useGroup, type Member, type GroupSummary } from "../../lib/social";
import { useCategories, useCreateCategory } from "../../lib/ledger";
import {
  useDay,
  useCreateEvent,
  useEventDetail,
  useSetAttendance,
  useAddExtra,
  type AttendanceEntry,
  type Extra,
  type MealEvent,
  type Attendance,
} from "../../lib/haazri";

// ── helpers ────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

// ── types ──────────────────────────────────────────────────────────────────

type MemberRow = { userId: string; displayName: string };

type AttendanceState = {
  present: boolean;
  multiplier: number;
  guestLabel: string;
};

// ── sub-components ─────────────────────────────────────────────────────────

function MemberAttendanceRow({
  member,
  state,
  onChange,
}: {
  member: MemberRow;
  state: AttendanceState;
  onChange: (next: AttendanceState) => void;
}) {
  return (
    <Card>
      <Pressable
        onPress={() => onChange({ ...state, present: !state.present })}
        className="flex-row items-center gap-3"
      >
        <View
          className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
            state.present ? "bg-primary border-primary" : "border-border"
          }`}
        >
          {state.present && (
            <Text className="text-white text-xs font-bold">✓</Text>
          )}
        </View>
        <Text className="text-text font-medium flex-1">{member.displayName}</Text>
        {state.present && state.multiplier > 1 && (
          <Text className="text-text-muted text-xs">×{state.multiplier}</Text>
        )}
      </Pressable>
      {state.present && (
        <View className="mt-3 pl-9">
          <MultiplierStepper
            value={state.multiplier}
            guestLabel={state.guestLabel}
            onChange={(v, g) =>
              onChange({ ...state, multiplier: v, guestLabel: g })
            }
          />
        </View>
      )}
    </Card>
  );
}

// ── gate wrapper ───────────────────────────────────────────────────────────

export default function HaazriScreen() {
  const { groupId } = useSelectedGroup();
  const groupsQuery = useGroups();
  const selectedGroupSummary = groupsQuery.data?.find((g: GroupSummary) => g.id === groupId);
  const canManage =
    selectedGroupSummary?.my_role === "owner" ||
    selectedGroupSummary?.my_role === "admin";

  if (!groupId || !selectedGroupSummary || !canManage) {
    return (
      <Screen>
        <Card>
          <Text className="text-text font-semibold text-center py-2">
            Select a group you manage to mark Haazri.
          </Text>
        </Card>
      </Screen>
    );
  }

  return <HaazriContent groupId={groupId} />;
}

// ── HaazriContent (rendered only when gated) ──────────────────────────────

function HaazriContent({ groupId }: { groupId: string }) {
  const now = new Date();
  const [date, setDate] = useState<Date>(now);
  const [poolId, setPoolId] = useState<string | null>(null);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, AttendanceState>
  >({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  // Extra modal state
  const [extraModal, setExtraModal] = useState(false);
  const [extraTitle, setExtraTitle] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [extraPaidBy, setExtraPaidBy] = useState<string | null>(null);
  const [savingExtra, setSavingExtra] = useState(false);
  const [extraError, setExtraError] = useState<string | null>(null);

  const dateStr = toDateString(date);

  // ── data hooks (always called unconditionally) ─────────────────────────
  const groupQuery = useGroup(groupId);
  const members: Member[] = groupQuery.data?.members ?? [];

  const categoriesQuery = useCategories(groupId, "kitchen_pool");
  const createCategoryMut = useCreateCategory(groupId);

  const dayQuery = useDay(groupId, dateStr);
  const createEventMut = useCreateEvent(groupId);

  // Resolve event: look up from day events by matching category field (type-safe now).
  const existingEventId =
    dayQuery.data?.find((e: MealEvent) => e.category === poolId)?.id ?? undefined;

  const resolvedEventId = existingEventId ?? null;

  const eventDetailQuery = useEventDetail(resolvedEventId);
  const setAttendanceMut = useSetAttendance();
  const addExtraMut = useAddExtra();

  // Build member rows
  const memberRows: MemberRow[] = members.map((m) => ({
    userId: m.user.id,
    displayName: m.user.name || m.user.email || m.user.id,
  }));

  // Build initial attendance map from event detail
  const initAttendanceMap = useCallback((): Record<string, AttendanceState> => {
    const detail = eventDetailQuery.data;
    const init: Record<string, AttendanceState> = {};
    memberRows.forEach((mr) => {
      const existing = detail?.attendance.find((a: Attendance) => a.user.id === mr.userId);
      init[mr.userId] = existing
        ? {
            present: true,
            multiplier: existing.multiplier,
            guestLabel: existing.guest_label ?? "",
          }
        : { present: false, multiplier: 1, guestLabel: "" };
    });
    return init;
  }, [eventDetailQuery.data, memberRows]);

  // ── handlers ───────────────────────────────────────────────────────────

  const handlePoolChange = (id: string) => {
    setPoolId(id);
    setAttendanceMap({});
    setAttendanceSaved(false);
    setAttendanceError(null);
  };

  const handleDateChange = (delta: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + delta);
    setDate(next);
    setAttendanceMap({});
    setAttendanceSaved(false);
    setAttendanceError(null);
  };

  const handleSaveAttendance = async () => {
    if (!poolId) {
      setAttendanceError("Select a kitchen pool first.");
      return;
    }
    setSavingAttendance(true);
    setAttendanceError(null);
    setAttendanceSaved(false);
    try {
      const ev = existingEventId
        ? { id: existingEventId }
        : await createEventMut.mutateAsync({ date: dateStr, category: poolId });
      const map =
        Object.keys(attendanceMap).length === 0
          ? initAttendanceMap()
          : attendanceMap;
      const entries: AttendanceEntry[] = Object.entries(map)
        .filter(([, s]) => s.present)
        .map(([userId, s]) => ({
          user: userId,
          multiplier: s.multiplier,
          ...(s.guestLabel ? { guest_label: s.guestLabel } : {}),
        }));
      await setAttendanceMut.mutateAsync({ eventId: ev.id, entries });
      setAttendanceSaved(true);
    } catch (err) {
      setAttendanceError(extractDetail(err));
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleAddExtra = async () => {
    if (!extraTitle.trim()) {
      setExtraError("Title is required.");
      return;
    }
    if (!extraAmount || parseFloat(extraAmount) <= 0) {
      setExtraError("Enter a valid amount.");
      return;
    }
    if (!extraPaidBy) {
      setExtraError("Select who paid.");
      return;
    }
    setSavingExtra(true);
    setExtraError(null);
    try {
      if (!poolId) throw new Error("Select a kitchen pool first.");
      const ev = existingEventId
        ? { id: existingEventId }
        : await createEventMut.mutateAsync({ date: dateStr, category: poolId });
      await addExtraMut.mutateAsync({
        eventId: ev.id,
        title: extraTitle.trim(),
        amount: extraAmount,
        paid_by: extraPaidBy,
      });
      setExtraTitle("");
      setExtraAmount("");
      setExtraPaidBy(null);
      setExtraModal(false);
    } catch (err) {
      setExtraError(extractDetail(err));
    } finally {
      setSavingExtra(false);
    }
  };

  // Merged attendance map: fallback to event detail when local map is empty
  const currentAttendanceMap =
    Object.keys(attendanceMap).length === 0 && eventDetailQuery.data
      ? initAttendanceMap()
      : attendanceMap;

  const updateMemberState = (userId: string, next: AttendanceState) => {
    setAttendanceMap((prev) => {
      // If map was empty (not yet initialised), seed it first
      const base =
        Object.keys(prev).length === 0 ? initAttendanceMap() : prev;
      return { ...base, [userId]: next };
    });
  };

  const extras = eventDetailQuery.data?.extras ?? [];

  // ── render ──────────────────────────────────────────────────────────────

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="gap-4 pb-8">
          {/* Title */}
          <Text className="text-2xl font-bold text-text">Haazri</Text>

          {/* Date selector */}
          <Card>
            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => handleDateChange(-1)}
                className="px-4 py-2 rounded-xl border border-border"
              >
                <Text className="text-text font-semibold text-base">‹</Text>
              </Pressable>
              <Text className="text-text font-semibold text-base">
                {formatDate(date)}
              </Text>
              <Pressable
                onPress={() => handleDateChange(1)}
                className="px-4 py-2 rounded-xl border border-border"
              >
                <Text className="text-text font-semibold text-base">›</Text>
              </Pressable>
            </View>
          </Card>

          {/* Pool selector */}
          <Card>
            <CategoryPicker
              categories={categoriesQuery.data ?? []}
              value={poolId}
              onChange={handlePoolChange}
              onAdd={async (name) => {
                const cat = await createCategoryMut.mutateAsync({
                  ledger_type: "kitchen_pool",
                  name,
                });
                return cat;
              }}
              kind="kitchen_pool"
            />
          </Card>

          {!poolId && (
            <Text className="text-text-muted text-sm text-center">
              Select a kitchen pool to mark attendance.
            </Text>
          )}

          {/* Member checklist */}
          {poolId && (
            <>
              {groupQuery.isLoading || eventDetailQuery.isLoading ? (
                <ActivityIndicator />
              ) : (
                <View className="gap-3">
                  <Text className="text-text font-semibold text-base">
                    Members
                  </Text>
                  {memberRows.map((mr) => (
                    <MemberAttendanceRow
                      key={mr.userId}
                      member={mr}
                      state={
                        currentAttendanceMap[mr.userId] ?? {
                          present: false,
                          multiplier: 1,
                          guestLabel: "",
                        }
                      }
                      onChange={(next) => updateMemberState(mr.userId, next)}
                    />
                  ))}

                  {attendanceError && (
                    <Text className="text-owe text-sm">{attendanceError}</Text>
                  )}
                  {attendanceSaved && (
                    <Text className="text-primary text-sm">
                      Attendance saved.
                    </Text>
                  )}

                  <Button
                    label="Save Attendance"
                    onPress={handleSaveAttendance}
                    loading={savingAttendance}
                  />
                </View>
              )}

              {/* Extras section */}
              <View className="gap-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-text font-semibold text-base">
                    Extra Amounts
                  </Text>
                  <Pressable
                    onPress={() => setExtraModal(true)}
                    className="bg-primary px-3 py-2 rounded-xl"
                  >
                    <Text className="text-white text-sm font-semibold">
                      + Add
                    </Text>
                  </Pressable>
                </View>

                {extras.length === 0 ? (
                  <Text className="text-text-muted text-sm">
                    No extra amounts for this event.
                  </Text>
                ) : (
                  extras.map((ex: Extra) => (
                    <Card key={ex.id}>
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                          <Text className="text-text font-medium">
                            {ex.title}
                          </Text>
                          <Text className="text-text-muted text-xs">
                            Paid by {ex.paid_by.name || ex.paid_by.email}
                          </Text>
                        </View>
                        <Text className="text-owe font-semibold">
                          PKR {ex.amount}
                        </Text>
                      </View>
                    </Card>
                  ))
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Extra Amount Modal */}
      <Modal
        visible={extraModal}
        transparent
        animationType="slide"
        onRequestClose={() => setExtraModal(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-bg rounded-t-3xl p-6 gap-4">
            <Text className="text-text text-lg font-bold">
              Add Extra Amount
            </Text>

            <TextField
              label="Title"
              value={extraTitle}
              onChangeText={setExtraTitle}
              placeholder="e.g. Gas refill"
            />

            <AmountInput
              value={extraAmount}
              onChangeText={setExtraAmount}
            />

            <View className="gap-2">
              <Text className="text-text-muted text-sm">Paid by</Text>
              <View className="flex-row flex-wrap gap-2">
                {memberRows.map((mr) => (
                  <Pressable
                    key={mr.userId}
                    onPress={() => setExtraPaidBy(mr.userId)}
                    className={`px-3 py-2 rounded-full border ${
                      extraPaidBy === mr.userId
                        ? "bg-mint border-primary"
                        : "bg-surface border-border"
                    }`}
                  >
                    <Text
                      className={
                        extraPaidBy === mr.userId
                          ? "text-primary-dark"
                          : "text-text-muted"
                      }
                    >
                      {mr.displayName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {extraError && (
              <Text className="text-owe text-sm">{extraError}</Text>
            )}

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => {
                  setExtraModal(false);
                  setExtraError(null);
                }}
                className="flex-1 py-4 rounded-2xl border border-border items-center"
              >
                <Text className="text-text-muted font-semibold">Cancel</Text>
              </Pressable>
              <View className="flex-1">
                <Button
                  label="Add"
                  onPress={handleAddExtra}
                  loading={savingExtra}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
