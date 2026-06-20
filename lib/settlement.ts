import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { User } from "./auth";

// ---------------------------------------------------------------------------
// Types — mirrored exactly from the backend serializers:
//   apps/settlement/serializers.py  (LineOutSerializer, TransferOutSerializer,
//                                    StandingSerializer, ActivityItemSerializer)
//   DecimalField serialises to string; UUIDs come as string from UUIDField.
// ---------------------------------------------------------------------------

export type Breakdown = {
  /** Non-kitchen expense shares for this user. */
  non_kitchen: { ledger_type: string; category_name: string; amount: string }[];
  /** Kitchen-pool meal cost shares (rate × units). */
  kitchen: { pool_name: string; units: number; rate: string; amount: string }[];
  /** Extra-amount shares from meal events. */
  extras: { pool_name: string; date: string; title: string; amount: string }[];
  /** Expenses the user paid out (all ledger types + kitchen extras). */
  paid: { label: string; ledger_type: string; amount: string }[];
};

/** One member's settlement line — mirrors LineOutSerializer. */
export type SettlementLine = {
  user: User;
  paid_total: string;
  owed_total: string;
  /** owed_total - paid_total; positive = user owes, negative = user is owed. */
  net: string;
  breakdown: Breakdown;
};

/** A minimised transfer — mirrors TransferOutSerializer. */
export type SettlementTransfer = {
  from_user: User;
  to_user: User;
  amount: string;
};

/** Shape returned by GET /groups/{id}/settlement/ and POST …/generate/. */
export type SettlementPreview = {
  year: number;
  month: number;
  /** True when all three LedgerPeriods (monthly_expense, kitchen, workplace) are finalized. */
  finalized: boolean;
  lines: SettlementLine[];
  transfers: SettlementTransfer[];
};

/** Extended shape returned by POST …/generate/ (includes persisted-record fields). */
export type GeneratedSettlement = SettlementPreview & {
  id: string;
  status: string;
};

/** Shape returned by GET /me/standing/ — mirrors StandingSerializer. */
export type Standing = {
  paid_total: string;
  owed_total: string;
  net: string;
  breakdown: Breakdown;
  /** Only the minimised transfers involving the requesting user. */
  transfers: SettlementTransfer[];
  /** "none" if no persisted Settlement exists for the period; else "draft" | "finalized". */
  settlement_status: "none" | "draft" | "finalized";
};

/**
 * One item in the activity feed — mirrors ActivityItemSerializer.
 *
 * For kind="expense": ledger_type is present, pool_name is absent.
 * For kind="meal": pool_name is present, ledger_type is absent.
 * amount: for expenses = the user's ExpenseShare.amount (or "0.00" if only payer);
 *         for meals = the user's proportional share of the event's ExtraAmount(s).
 */
export type ActivityItem = {
  kind: "expense" | "meal";
  date: string;
  title: string;
  ledger_type?: string;
  pool_name?: string;
  amount: string;
  role: "payer" | "participant";
};

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const settlementKeys = {
  preview: (groupId: string | null, year: number, month: number) =>
    ["settlement", groupId, year, month] as const,
  standing: (groupId: string | null, year: number, month: number) =>
    ["standing", groupId, year, month] as const,
  activity: (groupId: string | null, year: number, month: number) =>
    ["activity", groupId, year, month] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Admin-only: live settlement preview for a group month.
 * GET /groups/{groupId}/settlement/?year=&month=
 */
export const useSettlementPreview = (
  groupId: string | null,
  year: number,
  month: number,
) =>
  useQuery({
    queryKey: settlementKeys.preview(groupId, year, month),
    queryFn: async () =>
      (
        await api.get<SettlementPreview>(
          `/groups/${groupId}/settlement/?year=${year}&month=${month}`,
        )
      ).data,
    enabled: !!groupId,
  });

/**
 * Admin-only: persist a settlement for the given month.
 * POST /groups/{groupId}/settlement/{year}/{month}/generate/
 * Requires all three LedgerPeriods to be finalized (400 otherwise).
 */
export function useGenerateSettlement(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      year,
      month,
    }: {
      year: number;
      month: number;
    }): Promise<GeneratedSettlement> =>
      (
        await api.post<GeneratedSettlement>(
          `/groups/${groupId}/settlement/${year}/${month}/generate/`,
        )
      ).data,
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: settlementKeys.preview(groupId, vars.year, vars.month),
      });
    },
  });
}

/**
 * Member self-service: own settlement standing for a group month.
 * GET /me/standing/?group=&year=&month=
 */
export const useMyStanding = (
  groupId: string | null,
  year: number,
  month: number,
) =>
  useQuery({
    queryKey: settlementKeys.standing(groupId, year, month),
    queryFn: async () =>
      (
        await api.get<Standing>(
          `/me/standing/?group=${groupId}&year=${year}&month=${month}`,
        )
      ).data,
    enabled: !!groupId,
  });

/**
 * Member self-service: own activity feed for a group month.
 * GET /me/activity/?group=&year=&month=
 */
export const useActivity = (
  groupId: string | null,
  year: number,
  month: number,
) =>
  useQuery({
    queryKey: settlementKeys.activity(groupId, year, month),
    queryFn: async () =>
      (
        await api.get<ActivityItem[]>(
          `/me/activity/?group=${groupId}&year=${year}&month=${month}`,
        )
      ).data,
    enabled: !!groupId,
  });
