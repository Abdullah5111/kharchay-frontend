import { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { api } from "../../lib/api";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";

export default function RequestOtp() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true); setError("");
    try {
      await api.post("/auth/request-otp/", { email });
      router.push({ pathname: "/(auth)/verify-otp", params: { email } });
    } catch { setError("Couldn't send the code. Check your email and try again."); }
    finally { setLoading(false); }
  };

  return (
    <Screen>
      <Text className="text-2xl font-bold text-text">Welcome to Kharchay</Text>
      <Text className="text-text-muted">Enter your email and we'll send you a code.</Text>
      <TextField label="Email" value={email} onChangeText={setEmail}
        placeholder="you@example.com" keyboardType="email-address" autoFocus />
      {error ? <Text className="text-owe">{error}</Text> : null}
      <Button label="Send code" onPress={submit} loading={loading} />
    </Screen>
  );
}
