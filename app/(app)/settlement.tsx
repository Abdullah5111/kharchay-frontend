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
import { useSelectedGroup } from "../../lib/group";
import { useGroups, type GroupSummary } from "../../lib/social";
import {
  useSettlementPreview,
  useGenerateSettlement,
  type SettlementLine,
  type SettlementTransfer,
} from "../../lib/settlement";

// ── helpers ────────────────────────────────────────────────────────────────

function monthLabel(year: number, month: number): string {
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-PK", { month: "long", year: "numeric" });
}

function fmt(s: string | number): string {
  const n = typeof s === "string" ? Number(s) : s;
  return "₨" + n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// ── MemberRow ──────────────────────────────────────────────────────────────

function MemberRow({ line }: { line: SettlementLine }) {
  const net = Number(line.net);
  const absNet = Math.abs(net);
  const netColor = net > 0 ? "text-owe" : net < 0 ? "text-owed" : "text-text";
  const netLabel = net > 0 ? "owes" : net < 0 ? "gets back" : "settled";

  return (
    <Card>
      <View className="gap-1">
        <Text className="text-text font-semibold text-base">{line.user.name}</Text>
        <View className="flex-row gap-4 mt-1">
          <Text className="text-text-muted text-xs">
            Paid <Text className="text-text font-medium">{fmt(line.paid_total)}</Text>
          </Text>
          <Text className="text-text-muted text-xs">
            Owed <Text className="text-text font-medium">{fmt(line.owed_total)}</Text>
          </Text>
        </View>
        <View className="flex-row items-center gap-2 mt-1">
          <Text className={`${netColor} font-bold text-sm`}>
            {fmt(String(absNet))}
          </Text>
          <Text className="text-text-muted text-xs">{netLabel}</Text>
        </View>
      </View>
    </Card>
  );
}

// ── TransferRow ────────────────────────────────────────────────────────────

function TransferRow({ transfer }: { transfer: SettlementTransfer }) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-border last:border-b-0">
      <Text className="text-text text-sm flex-1">
        <Text className="font-semibold">{transfer.from_user.name}</Text>
        {" pays "}
        <Text className="font-semibold">{transfer.to_user.name}</Text>
      </Text>
      <Text className="text-owe font-bold text-sm">{fmt(transfer.amount)}</Text>
    </View>
  );
}

// ── SettlementContent ──────────────────────────────────────────────────────

function SettlementContent({ groupId }: { groupId: string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const previewQuery = useSettlementPreview(groupId, year, month);
  const generateMutation = useGenerateSettlement(groupId);

  const preview = previewQuery.data;

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

  const handleGenerate = async () => {
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await generateMutation.mutateAsync({ year, month });
      setSuccessMsg("Settlement generated.");
    } catch (err) {
      setErrorMsg(extractDetail(err));
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="gap-4 pb-8">
          <Text className="text-2xl font-bold text-text">Settlement</Text>

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

          {/* Loading */}
          {previewQuery.isLoading ? (
            <ActivityIndicator />
          ) : previewQuery.isError ? (
            <Card>
              <Text className="text-owe text-sm text-center py-2">
                Couldn't load the settlement preview.
              </Text>
            </Card>
          ) : !preview ? (
            <Card>
              <Text className="text-text-muted text-sm text-center py-2">
                Could not load settlement data.
              </Text>
            </Card>
          ) : (
            <>
              {/* Finalized banner */}
              <Card>
                {!preview.finalized ? (
                  <View className="gap-3">
                    <Text className="text-pending text-sm text-center">
                      Finalize Monthly, Kitchen and Workplace ledgers for this month to generate the settlement.
                    </Text>
                    <Pressable
                      disabled
                      className="bg-border rounded-2xl py-4 items-center opacity-50"
                    >
                      <Text className="text-text-muted font-semibold text-base">
                        Generate Settlement
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="gap-3">
                    <Text className="text-owed text-sm text-center font-medium">
                      All ledgers finalized. Ready to generate settlement.
                    </Text>
                    <Button
                      label="Generate Settlement"
                      onPress={handleGenerate}
                      loading={generateMutation.isPending}
                    />
                  </View>
                )}
              </Card>

              {/* Success / Error feedback */}
              {successMsg && (
                <Card>
                  <Text className="text-owed text-sm text-center font-medium">
                    {successMsg}
                  </Text>
                </Card>
              )}
              {errorMsg && (
                <Card>
                  <Text className="text-owe text-sm text-center">
                    {errorMsg}
                  </Text>
                </Card>
              )}

              {/* Members table */}
              {preview.lines.length === 0 ? (
                <Card>
                  <Text className="text-text-muted text-sm text-center py-2">
                    No activity to settle this month.
                  </Text>
                </Card>
              ) : (
                <View className="gap-2">
                  <Text className="text-text font-semibold text-base px-1">
                    Members
                  </Text>
                  {preview.lines.map((line: SettlementLine) => (
                    <MemberRow key={line.user.id} line={line} />
                  ))}
                </View>
              )}

              {/* Transfers section */}
              {preview.transfers.length > 0 && (
                <Card>
                  <Text className="text-text font-semibold text-base mb-2">
                    Proposed Transfers
                  </Text>
                  {preview.transfers.map((t: SettlementTransfer, i: number) => (
                    <TransferRow key={i} transfer={t} />
                  ))}
                </Card>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

// ── default export (admin gate) ────────────────────────────────────────────

export default function SettlementScreen() {
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
            Select a group you manage to view settlement.
          </Text>
        </Card>
      </Screen>
    );
  }

  return <SettlementContent groupId={groupId} />;
}
