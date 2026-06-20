import { useState } from "react";
import { Text, View, Pressable, FlatList } from "react-native";
import { router } from "expo-router";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useGroups, useCreateGroup, useInvites, useRespondInvite, type GroupInvite } from "../../lib/social";
import { useSelectedGroup } from "../../lib/group";

export default function Groups() {
  const groups = useGroups();
  const invites = useInvites();
  const create = useCreateGroup();
  const respond = useRespondInvite();
  const { setGroupId } = useSelectedGroup();
  const [name, setName] = useState("");

  const make = async () => { if (!name.trim()) return; const g = await create.mutateAsync(name.trim()); setName(""); setGroupId(g.id); };

  return (
    <Screen>
      <Text className="text-2xl font-bold text-text">Groups</Text>
      <TextField label="Create a group" value={name} onChangeText={setName} placeholder="House 8" />
      <Button label="Create" onPress={make} loading={create.isPending} />

      {(invites.data?.length ?? 0) > 0 && (
        <View className="gap-2">
          <Text className="text-text-muted mt-2">Invites</Text>
          {invites.data!.map((i: GroupInvite) => (
            <Card key={i.id}>
              <Text className="text-text font-semibold">{i.group.name}</Text>
              <Text className="text-text-muted">from {i.invited_by?.name ?? "someone"}</Text>
              <View className="flex-row gap-2 mt-2">
                <Pressable className="bg-primary rounded-xl px-4 py-2" onPress={() => respond.mutate({ id: i.id, action: "accept" })}><Text className="text-white">Accept</Text></Pressable>
                <Pressable className="bg-border rounded-xl px-4 py-2" onPress={() => respond.mutate({ id: i.id, action: "reject" })}><Text className="text-text">Reject</Text></Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}

      <Text className="text-text-muted mt-2">Your groups</Text>
      <FlatList data={groups.data ?? []} keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => { setGroupId(item.id); router.push(`/(app)/group/${item.id}`); }}>
            <Card>
              <Text className="text-text font-semibold">{item.name}</Text>
              <Text className="text-text-muted">{item.my_role} · {item.member_count} members</Text>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={<Text className="text-text-muted">No groups yet.</Text>}
        contentContainerClassName="gap-2" />
    </Screen>
  );
}
