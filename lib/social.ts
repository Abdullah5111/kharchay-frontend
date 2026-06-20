import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { User } from "./auth";

export type Friend = User;
export type FriendRequest = { id: string; user: User; direction: "incoming" | "outgoing"; created_at: string };
export type GroupSummary = { id: string; name: string; my_role: "owner" | "admin" | "member" | null; member_count: number };
export type Member = { user: User; role: "owner" | "admin" | "member"; status: string };
export type GroupDetail = GroupSummary & { members: Member[] };
export type GroupInvite = { id: string; group: { id: string; name: string }; invited_by: User | null };

export const useFriends = () =>
  useQuery({ queryKey: ["friends"], queryFn: async () => (await api.get<Friend[]>("/friends/")).data });

export const useFriendRequests = (direction: "incoming" | "outgoing") =>
  useQuery({
    queryKey: ["friendRequests", direction],
    queryFn: async () => (await api.get<FriendRequest[]>(`/friends/requests/list/?direction=${direction}`)).data,
  });

export const useGroups = () =>
  useQuery({ queryKey: ["groups"], queryFn: async () => (await api.get<GroupSummary[]>("/groups/")).data });

export const useGroup = (id: string | null) =>
  useQuery({
    queryKey: ["group", id],
    queryFn: async () => (await api.get<GroupDetail>(`/groups/${id}/`)).data,
    enabled: !!id,
  });

export const useInvites = () =>
  useQuery({ queryKey: ["invites"], queryFn: async () => (await api.get<GroupInvite[]>("/invites/")).data });

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => (await api.post("/friends/requests/", { email })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friendRequests"] }),
  });
}

export function useRespondFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "reject" }) =>
      (await api.post(`/friends/requests/${id}/${action}/`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["friendRequests"] }); qc.invalidateQueries({ queryKey: ["friends"] }); },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => (await api.post<GroupSummary>("/groups/", { name })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useInviteToGroup(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => (await api.post(`/groups/${id}/invite/`, { email })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["group", id] }),
  });
}

export function useRespondInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "accept" | "reject" }) =>
      (await api.post(`/invites/${id}/${action}/`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invites"] }); qc.invalidateQueries({ queryKey: ["groups"] }); },
  });
}

export function useSetRole(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "admin" | "member" }) =>
      (await api.post(`/groups/${id}/members/${userId}/role/`, { role })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group", id] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

export function useRemoveMember(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => (await api.delete(`/groups/${id}/members/${userId}/`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group", id] });
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
