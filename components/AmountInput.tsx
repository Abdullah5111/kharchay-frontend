import { TextInput, Text, View } from "react-native";

export function AmountInput({ value, onChangeText, label = "Amount (PKR)" }:
  { value: string; onChangeText: (t: string) => void; label?: string }) {
  const onChange = (t: string) => onChangeText(t.replace(/[^0-9.]/g, ""));
  return (
    <View className="gap-2">
      <Text className="text-text-muted text-sm">{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType="decimal-pad" placeholder="0.00"
        className="bg-surface border border-border rounded-2xl px-4 py-3 text-text text-base" />
    </View>
  );
}
