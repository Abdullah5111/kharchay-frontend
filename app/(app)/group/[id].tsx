import { useState } from "react";
import { Text, View, Pressable, FlatList } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Screen } from "../../../components/Screen";
import { TextField } from "../../../components/TextField";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { useGroup, useInviteToGroup, useSetRole, useRemoveMember } from "../../../lib/social";
import type { Member } from "../../../lib/social";

export default function GroupDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const group = useGroup(id);
  const invite = useInviteToGroup(id);
  const setRole = useSetRole(id);
  const remove = useRemoveMember(id);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const amAdmin = group.data?.my_role === "owner" || group.data?.my_role === "admin";
  const amOwner = group.data?.my_role === "owner";

  const doInvite = async () => {
    setError("");
    try { await invite.mutateAsync(email); setEmail(""); }
    catch (e: any) { setError(e?.response?.data?.detail ?? "Could not invite."); }
  };

  return (
    <Screen>
      <Text className="text-2xl font-bold text-text">{group.data?.name ?? "Group"}</Text>

      {amAdmin && (
        <View className="gap-2">
          <TextField label="Invite a friend by email" value={email} onChangeText={setEmail}
            placeholder="friend@example.com" keyboardType="email-address" />
          {error ? <Text className="text-owe">{error}</Text> : null}
          <Button label="Invite" onPress={doInvite} loading={invite.isPending} />
        </View>
      )}

      <Text className="text-text-muted mt-2">Members</Text>
      <FlatList data={group.data?.members ?? []} keyExtractor={(m) => m.user.id}
        renderItem={({ item }: { item: Member }) => (
          <Card>
            <Text className="text-text font-semibold">{item.user.name || item.user.email}</Text>
            <Text className="text-text-muted">{item.role}</Text>
            {amOwner && item.role !== "owner" && (
              <View className="flex-row gap-2 mt-2">
                <Pressable className="bg-mint-bg rounded-xl px-3 py-2"
                  onPress={() => setRole.mutate({ userId: item.user.id, role: item.role === "admin" ? "member" : "admin" })}>
                  <Text className="text-primary-dark">{item.role === "admin" ? "Make member" : "Make admin"}</Text>
                </Pressable>
                <Pressable className="bg-border rounded-xl px-3 py-2" onPress={() => remove.mutate(item.user.id)}>
                  <Text className="text-text">Remove</Text>
                </Pressable>
              </View>
            )}
          </Card>
        )}
        contentContainerClassName="gap-2" />
    </Screen>
  );
}
