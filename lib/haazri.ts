import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { User } from "./auth";
import type { Member } from "./social";

// Re-export for consumers that need them
export type { Member };

// ── Types ──────────────────────────────────────────────────────────────────

export type MealEvent = {
  id: string;
  category: string;
  category_name: string;
  date: string;
  note: string;
  attendance: Attendance[];
};

export type Attendance = {
  id: string;
  user: User;
  multiplier: number;
  guest_label: string;
};

export type Extra = {
  id: string;
  title: string;
  amount: string; // decimal as string
  paid_by: User;
};

export type HaazriSummary = {
  user: User;
  total_meals: number;
  total_amount: string; // decimal as string
  meal_rate: string;    // decimal as string
};

export type MyHaazriRow = {
  attendance_id: string;
  event_id: string;
  date: string;
  category_name: string;
  multiplier: number;
  guest_label: string;
  user: User;
};

export type Dispute = {
  id: string;
  attendance: string;
  raised_by: User;
  reason: string;
  status: "open" | "resolved" | "rejected";
  resolved_by: User | null;
  resolved_at: string | null;
  created_at: string;
};

export type MealEventDetail = MealEvent & {
  extras: Extra[];
};

// ── Attendance entry shape for bulk update ─────────────────────────────────

export type AttendanceEntry = {
  user: string;      // user id
  multiplier: number; // integer >= 1
  guest_label?: string;
};

// ── Query hooks ────────────────────────────────────────────────────────────

/** GET /groups/{id}/haazri/?date=YYYY-MM-DD */
export const useDay = (groupId: string | null, date?: string) =>
  useQuery({
    queryKey: ["haazri", "events", groupId, date ?? null],
    queryFn: async () => {
      const url = date
        ? `/groups/${groupId}/haazri/?date=${date}`
        : `/groups/${groupId}/haazri/`;
      return (await api.get<MealEvent[]>(url)).data;
    },
    enabled: !!groupId,
  });

/** GET /haazri/{eventId}/ */
export const useEventDetail = (eventId: string | null) =>
  useQuery({
    queryKey: ["haazri", "event", eventId],
    queryFn: async () => (await api.get<MealEventDetail>(`/haazri/${eventId}/`)).data,
    enabled: !!eventId,
  });

/** GET /groups/{id}/haazri/summary/?year=&month= */
export const useHaazriSummary = (groupId: string | null, year: number, month: number) =>
  useQuery({
    queryKey: ["haazri", "summary", groupId, year, month],
    queryFn: async () =>
      (await api.get<HaazriSummary[]>(`/groups/${groupId}/haazri/summary/?year=${year}&month=${month}`)).data,
    enabled: !!groupId,
  });

/** GET /me/haazri/?group=&year=&month= */
export const useMyHaazri = (groupId: string | null, year: number, month: number) =>
  useQuery({
    queryKey: ["haazri", "my", groupId, year, month],
    queryFn: async () =>
      (await api.get<MyHaazriRow[]>(`/me/haazri/?group=${groupId}&year=${year}&month=${month}`)).data,
    enabled: !!groupId,
  });

/** GET /groups/{id}/haazri/disputes/ */
export const useDisputes = (groupId: string | null) =>
  useQuery({
    queryKey: ["haazri", "disputes", groupId],
    queryFn: async () => (await api.get<Dispute[]>(`/groups/${groupId}/haazri/disputes/`)).data,
    enabled: !!groupId,
  });

// ── Mutation hooks ─────────────────────────────────────────────────────────

/** POST /groups/{id}/haazri/ */
export function useCreateEvent(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { date: string; category: string; note?: string }) =>
      (await api.post<MealEvent>(`/groups/${groupId}/haazri/`, body)).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["haazri", "events", groupId, v.date] });
      qc.invalidateQueries({ queryKey: ["haazri", "events", groupId, null] });
    },
  });
}

/** PUT /haazri/{eventId}/attendance/ with body { entries: AttendanceEntry[] } */
export function useSetAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, entries }: { eventId: string; entries: AttendanceEntry[] }) =>
      (await api.put<Attendance[]>(`/haazri/${eventId}/attendance/`, { entries })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["haazri", "event", v.eventId] });
      qc.invalidateQueries({ queryKey: ["haazri", "events"] });
    },
  });
}

/** POST /haazri/{eventId}/extras/ */
export function useAddExtra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, title, amount, paid_by }: { eventId: string; title?: string; amount: string; paid_by: string }) =>
      (await api.post<Extra>(`/haazri/${eventId}/extras/`, { title, amount, paid_by })).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["haazri", "event", v.eventId] });
      qc.invalidateQueries({ queryKey: ["haazri", "events"] });
    },
  });
}

/** POST /haazri/attendance/{attendanceId}/dispute/ */
export function useRaiseDispute(attendanceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { reason: string }) =>
      (await api.post<Dispute>(`/haazri/attendance/${attendanceId}/dispute/`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["haazri", "disputes"] });
      qc.invalidateQueries({ queryKey: ["haazri", "my"] });
    },
  });
}

/** POST /haazri/disputes/{id}/resolve/ */
export function useResolveDispute(disputeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { action: "resolve" | "reject"; note?: string }) =>
      (await api.post<Dispute>(`/haazri/disputes/${disputeId}/resolve/`, body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["haazri", "disputes"] });
    },
  });
}
