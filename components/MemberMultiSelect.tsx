import { Text, View, Pressable } from "react-native";
import type { Member } from "../lib/social";

export function MemberMultiSelect({ members, selected, onToggle }:
  { members: Member[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <View className="gap-2">
      <Text className="text-text-muted text-sm">Split between</Text>
      <View className="flex-row flex-wrap gap-2">
        {members.map((m) => {
          const on = selected.includes(m.user.id);
          return (
            <Pressable key={m.user.id} onPress={() => onToggle(m.user.id)}
              className={`px-3 py-2 rounded-full border ${on ? "bg-mint border-primary" : "bg-surface border-border"}`}>
              <Text className={on ? "text-primary-dark" : "text-text-muted"}>{m.user.name || m.user.email}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
