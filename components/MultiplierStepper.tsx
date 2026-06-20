import { Text, TouchableOpacity, View } from "react-native";
import { TextField } from "./TextField";

type Props = {
  value: number;
  guestLabel: string;
  onChange: (value: number, guestLabel: string) => void;
};

export function MultiplierStepper({ value, guestLabel, onChange }: Props) {
  const decrement = () => {
    if (value <= 1) return;
    const next = value - 1;
    // Clear guest label when dropping back to 1
    onChange(next, next === 1 ? "" : guestLabel);
  };

  const increment = () => {
    onChange(value + 1, guestLabel);
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-4">
        <TouchableOpacity
          onPress={decrement}
          disabled={value <= 1}
          className={`w-10 h-10 rounded-full items-center justify-center border ${
            value <= 1 ? "border-border opacity-40" : "border-primary"
          }`}
        >
          <Text
            className={`text-xl font-semibold leading-none ${
              value <= 1 ? "text-text-muted" : "text-primary"
            }`}
          >
            −
          </Text>
        </TouchableOpacity>

        <Text className="text-text text-lg font-semibold w-8 text-center">
          {value}
        </Text>

        <TouchableOpacity
          onPress={increment}
          className="w-10 h-10 rounded-full items-center justify-center border border-primary"
        >
          <Text className="text-primary text-xl font-semibold leading-none">+</Text>
        </TouchableOpacity>
      </View>

      {value > 1 && (
        <TextField
          label="Guest label (optional)"
          value={guestLabel}
          onChangeText={(t) => onChange(value, t)}
          placeholder="e.g. Cousin Ali"
        />
      )}
    </View>
  );
}
