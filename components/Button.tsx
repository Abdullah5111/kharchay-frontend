import { Pressable, Text, ActivityIndicator } from "react-native";

export function Button({ label, onPress, loading }: { label: string; onPress: () => void; loading?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="bg-primary active:bg-primary-dark rounded-2xl py-4 items-center"
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold text-base">{label}</Text>}
    </Pressable>
  );
}
