import { View } from "react-native";

export function Card({ children }: { children: React.ReactNode }) {
  return <View className="bg-surface border border-border rounded-2xl p-4 gap-1">{children}</View>;
}
