import { TextInput, Text, View } from "react-native";

export function TextField(props: { label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: "default" | "email-address" | "number-pad"; autoFocus?: boolean }) {
  return (
    <View className="gap-2">
      <Text className="text-text-muted text-sm">{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        keyboardType={props.keyboardType ?? "default"}
        autoCapitalize="none"
        autoFocus={props.autoFocus}
        className="bg-surface border border-border rounded-2xl px-4 py-3 text-text text-base"
      />
    </View>
  );
}
