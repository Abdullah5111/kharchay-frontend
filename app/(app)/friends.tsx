import { useState } from "react";
import { Text, View, Pressable, FlatList } from "react-native";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useFriends, useFriendRequests, useSendFriendRequest, useRespondFriendRequest, type FriendRequest } from "../../lib/social";

export default function Friends() {
  const friends = useFriends();
  const incoming = useFriendRequests("incoming");
  const send = useSendFriendRequest();
  const respond = useRespondFriendRequest();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const add = async () => {
    setError("");
    try { await send.mutateAsync(email); setEmail(""); }
    catch (e: any) { setError(e?.response?.data?.detail ?? "Could not send request."); }
  };

  return (
    <Screen>
      <Text className="text-2xl font-bold text-text">Friends</Text>
      <TextField label="Add a friend by email" value={email} onChangeText={setEmail}
        placeholder="friend@example.com" keyboardType="email-address" />
      {error ? <Text className="text-owe">{error}</Text> : null}
      <Button label="Send request" onPress={add} loading={send.isPending} />

      {(incoming.data?.length ?? 0) > 0 && (
        <View className="gap-2">
          <Text className="text-text-muted mt-2">Requests</Text>
          {incoming.data!.map((r: FriendRequest) => (
            <Card key={r.id}>
              <Text className="text-text font-semibold">{r.user.name || r.user.email}</Text>
              <View className="flex-row gap-2 mt-2">
                <Pressable className="bg-primary rounded-xl px-4 py-2" onPress={() => respond.mutate({ id: r.id, action: "accept" })}>
                  <Text className="text-white">Accept</Text>
                </Pressable>
                <Pressable className="bg-border rounded-xl px-4 py-2" onPress={() => respond.mutate({ id: r.id, action: "reject" })}>
                  <Text className="text-text">Reject</Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      )}

      <Text className="text-text-muted mt-2">Your friends</Text>
      <FlatList data={friends.data ?? []} keyExtractor={(f) => f.id}
        renderItem={({ item }) => <Card><Text className="text-text font-semibold">{item.name || item.email}</Text><Text className="text-text-muted">{item.email}</Text></Card>}
        ListEmptyComponent={<Text className="text-text-muted">No friends yet.</Text>}
        contentContainerClassName="gap-2" />
    </Screen>
  );
}
