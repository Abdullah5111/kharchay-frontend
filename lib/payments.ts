import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { User } from "./auth";

// ---------------------------------------------------------------------------
// Types — mirrored exactly from the backend serializers:
//   apps/payments/serializers.py  (PaymentSerializer)
//   DecimalField serialises to string; UUIDs come as string from UUIDField.
// ---------------------------------------------------------------------------

export type PaymentStatus = "submitted" | "approved" | "rejected";

export type Payment = {
  id: string;
  user: User;
  year: number;
  month: number;
  /** DecimalField — serialized as string by DRF. */
  amount: string;
  method: string;
  status: PaymentStatus;
  proof_url: string | null;
  review_note: string;
  reviewed_by: User | null;
  reviewed_at: string | null;
  submitted_at: string;
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Member self-service: own payment history for a group, optionally filtered by month/year.
 * GET /me/payments/?group=&year=&month=
 */
export function useMyPayments(
  groupId: string | null,
  year?: number,
  month?: number,
) {
  return useQuery({
    queryKey: ["my-payments", groupId, year, month] as const,
    queryFn: async () => {
      const params = new URLSearchParams({ group: groupId! });
      if (year != null) params.append("year", String(year));
      if (month != null) params.append("month", String(month));
      return (await api.get<Payment[]>(`/me/payments/?${params}`)).data;
    },
    enabled: !!groupId,
  });
}

/**
 * Admin-only: all payments for a group, optionally filtered by status.
 * GET /groups/{groupId}/payments/?status=
 */
export function useGroupPayments(
  groupId: string | null,
  status?: PaymentStatus,
) {
  return useQuery({
    queryKey: ["group-payments", groupId, status] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      const qs = params.toString() ? `?${params}` : "";
      return (await api.get<Payment[]>(`/groups/${groupId}/payments/${qs}`)).data;
    },
    enabled: !!groupId,
  });
}

/**
 * Member: submit a payment for the current user for a group month.
 * POST /groups/{groupId}/payments/  (multipart/form-data)
 * imageUri is optional; if provided, the file is attached as "proof".
 */
export function useSubmitPayment(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      amount,
      method,
      year,
      month,
      imageUri,
    }: {
      amount: string;
      method: string;
      year: number;
      month: number;
      imageUri?: string;
    }): Promise<Payment> => {
      const form = new FormData();
      form.append("amount", amount);
      form.append("method", method);
      form.append("year", String(year));
      form.append("month", String(month));

      if (imageUri) {
        const filename = imageUri.split("/").pop() ?? "proof.jpg";
        const ext = (filename.split(".").pop() ?? "jpg").toLowerCase();
        const mimeMap: Record<string, string> = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          webp: "image/webp",
        };
        const type = mimeMap[ext] ?? "image/jpeg";
        form.append("proof", { uri: imageUri, name: filename, type } as any);
      }

      return (
        await api.post<Payment>(`/groups/${groupId}/payments/`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-payments", groupId] });
      qc.invalidateQueries({ queryKey: ["group-payments", groupId] });
      qc.invalidateQueries({ queryKey: ["standing", groupId] });
    },
  });
}

/**
 * Admin: approve a submitted payment.
 * POST /payments/{id}/approve/   body: { review_note }
 */
export function useApprovePayment(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      review_note,
    }: {
      id: string;
      review_note: string;
    }): Promise<Payment> =>
      (await api.post<Payment>(`/payments/${id}/approve/`, { review_note })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group-payments", groupId] });
      qc.invalidateQueries({ queryKey: ["my-payments", groupId] });
    },
  });
}

/**
 * Admin: reject a submitted payment.
 * POST /payments/{id}/reject/   body: { review_note }
 */
export function useRejectPayment(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      review_note,
    }: {
      id: string;
      review_note: string;
    }): Promise<Payment> =>
      (await api.post<Payment>(`/payments/${id}/reject/`, { review_note })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group-payments", groupId] });
      qc.invalidateQueries({ queryKey: ["my-payments", groupId] });
    },
  });
}
