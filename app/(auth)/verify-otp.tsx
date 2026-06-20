import { useState } from "react";
import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../lib/api";
import { useAuth, User } from "../../lib/auth";

type VerifyOtpResponse = { access: string; refresh: string; user: User; is_new: boolean };
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { Button } from "../../components/Button";

export default function VerifyOtp() {
  const params = useLocalSearchParams<{ email: string }>();
  const email = Array.isArray(params.email) ? params.email[0] : params.email ?? "";
  const { signIn } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.post<VerifyOtpResponse>("/auth/verify-otp/", { email, code });
      await signIn({ access: data.access, refresh: data.refresh }, data.user);
      router.replace(data.user.name ? "/(app)/profile" : "/(auth)/complete-profile");
    } catch {
      setError("Invalid or expired code");
    } finally { setLoading(false); }
  };

  return (
    <Screen>
      <Text className="text-2xl font-bold text-text">Enter your code</Text>
      <Text className="text-text-muted">Sent to {email}</Text>
      <TextField label="6-digit code" value={code} onChangeText={setCode}
        keyboardType="number-pad" autoFocus />
      {error ? <Text className="text-owe">{error}</Text> : null}
      <Button label="Verify" onPress={submit} loading={loading} />
    </Screen>
  );
}
