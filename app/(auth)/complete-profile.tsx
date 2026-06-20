import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";

export default function CompleteProfile() {
  const { refreshUser } = useAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await api.patch("/me/", { name });
      await refreshUser();
      router.replace("/(app)/profile");
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Text className="text-2xl font-bold text-text">What's your name?</Text>
      <TextField label="Full name" value={name} onChangeText={setName} autoFocus />
      <Button label="Continue" onPress={submit} loading={loading} />
    </Screen>
  );
}
