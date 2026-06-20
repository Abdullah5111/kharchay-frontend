import { useState } from "react";
import {
  Text,
  View,
  Pressable,
  Modal,
  Image,
  ScrollView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { AmountInput } from "./AmountInput";
import { TextField } from "./TextField";
import { Button } from "./Button";
import { useSubmitPayment } from "../lib/payments";

// ── helpers ────────────────────────────────────────────────────────────────

function extractDetail(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const resp = e["response"] as Record<string, unknown> | undefined;
    if (resp) {
      const data = resp["data"] as Record<string, unknown> | undefined;
      if (data?.["detail"]) return String(data["detail"]);
    }
    if (e["message"]) return String(e["message"]);
  }
  return "An unexpected error occurred.";
}

// ── SubmitPaymentModal ─────────────────────────────────────────────────────

export function SubmitPaymentModal({
  groupId,
  year,
  month,
  onClose,
}: {
  groupId: string;
  year: number;
  month: number;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submitPayment = useSubmitPayment(groupId);

  const pick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo permission is required to attach proof.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]?.uri) {
      setImageUri(res.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitPayment.mutateAsync({
        amount,
        method: method.trim(),
        year,
        month,
        imageUri: imageUri ?? undefined,
      });
      setDone(true);
    } catch (err) {
      setError(extractDetail(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-bg rounded-t-3xl p-6 gap-4">
          <Text className="text-text text-lg font-bold">Submit Payment</Text>

          {done ? (
            <>
              <Text className="text-primary text-sm">
                Payment submitted successfully. It will appear as pending until approved by an admin.
              </Text>
              <Button label="Close" onPress={onClose} />
            </>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View className="gap-4">
                <AmountInput value={amount} onChangeText={setAmount} />

                <TextField
                  label="Method"
                  value={method}
                  onChangeText={setMethod}
                  placeholder="e.g. JazzCash, Cash"
                />

                {/* Proof attachment */}
                <View className="gap-2">
                  <Text className="text-text-muted text-sm">Proof (optional)</Text>
                  {imageUri ? (
                    <View className="gap-2">
                      <Image
                        source={{ uri: imageUri }}
                        className="w-full h-40 rounded-2xl"
                        resizeMode="cover"
                      />
                      <Pressable
                        onPress={() => setImageUri(null)}
                        className="self-start bg-surface border border-border rounded-xl px-3 py-1"
                      >
                        <Text className="text-owe text-xs font-semibold">Remove</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={pick}
                      className="bg-surface border border-border rounded-2xl px-4 py-3 items-center"
                    >
                      <Text className="text-text-muted text-sm">Attach proof image</Text>
                    </Pressable>
                  )}
                </View>

                {error && (
                  <Text className="text-owe text-sm">{error}</Text>
                )}

                <View className="flex-row gap-3">
                  <Pressable
                    onPress={onClose}
                    className="flex-1 py-4 rounded-2xl border border-border items-center"
                  >
                    <Text className="text-text-muted font-semibold">Cancel</Text>
                  </Pressable>
                  <View className="flex-1">
                    <Button
                      label="Submit"
                      onPress={handleSubmit}
                      loading={submitting}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
