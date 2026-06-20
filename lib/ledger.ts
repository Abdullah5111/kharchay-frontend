import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { User } from "./auth";

export type LedgerType = "monthly_expense" | "workplace" | "kitchen";
export type CategoryKind = "monthly_expense" | "workplace" | "kitchen_pool";
export type Category = { id: string; ledger_type: CategoryKind; name: string; color: string; is_archived: boolean };
export type Share = { user: User; amount: string };
export type Expense = {
  id: string; ledger_type: LedgerType; category: string; title: string;
  amount: string; paid_by: User; date: string; split_type: string; shares: Share[];
};
export type Period = { year: number; month: number; status: "open" | "finalized"; ledger_type: LedgerType };

export const useCategories = (groupId: string | null, kind: CategoryKind) =>
  useQuery({
    queryKey: ["categories", groupId, kind],
    queryFn: async () => (await api.get<Category[]>(`/groups/${groupId}/categories/?ledger=${kind}`)).data,
    enabled: !!groupId,
  });

export function useCreateCategory(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { ledger_type: CategoryKind; name: string }) =>
      (await api.post<Category>(`/groups/${groupId}/categories/`, body)).data,
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["categories", groupId, v.ledger_type] }),
  });
}

export const useExpenses = (groupId: string | null, ledger: LedgerType, year: number, month: number) =>
  useQuery({
    queryKey: ["expenses", groupId, ledger, year, month],
    queryFn: async () =>
      (await api.get<Expense[]>(`/groups/${groupId}/expenses/?ledger=${ledger}&year=${year}&month=${month}`)).data,
    enabled: !!groupId,
  });

export function useCreateExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      (await api.post<Expense>(`/groups/${groupId}/expenses/`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses", groupId] }),
  });
}

export function useUpdateExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      (await api.patch<Expense>(`/expenses/${id}/`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses", groupId] }),
  });
}

export function useDeleteExpense(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await api.delete(`/expenses/${id}/`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses", groupId] }),
  });
}

export const usePeriods = (groupId: string | null, ledger: LedgerType) =>
  useQuery({
    queryKey: ["periods", groupId, ledger],
    queryFn: async () => (await api.get<Period[]>(`/groups/${groupId}/periods/?ledger=${ledger}`)).data,
    enabled: !!groupId,
  });

export function useFinalizePeriod(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ledger, year, month }: { ledger: LedgerType; year: number; month: number }) =>
      (await api.post(`/groups/${groupId}/periods/${ledger}/${year}/${month}/finalize/`)).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["periods", groupId, v.ledger] });
      qc.invalidateQueries({ queryKey: ["expenses", groupId] });
    },
  });
}
