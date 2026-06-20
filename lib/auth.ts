import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api, setAccessToken } from "./api";

export type Tokens = { access: string; refresh: string };
export type User = { id: string; email: string; name: string; email_verified: boolean; avatar_key: string };
const KEY = "kharchay.tokens";

export const tokenStore = {
  async save(t: Tokens) { await SecureStore.setItemAsync(KEY, JSON.stringify(t)); },
  async get(): Promise<Tokens | null> {
    const v = await SecureStore.getItemAsync(KEY);
    return v ? (JSON.parse(v) as Tokens) : null;
  },
  async clear() { await SecureStore.deleteItemAsync(KEY); },
};

type AuthState = {
  user: User | null;
  status: "loading" | "signedOut" | "signedIn";
  signIn: (t: Tokens, u: User) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
};
const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState["status"]>("loading");

  useEffect(() => {
    (async () => {
      const t = await tokenStore.get();
      if (!t) { setStatus("signedOut"); return; }
      setAccessToken(t.access);
      try {
        const { data } = await api.get<User>("/me/");
        setUser(data); setStatus("signedIn");
      } catch {
        await tokenStore.clear(); setAccessToken(null); setStatus("signedOut");
      }
    })();
  }, []);

  const signIn = async (t: Tokens, u: User) => {
    await tokenStore.save(t); setAccessToken(t.access);
    setUser(u); setStatus("signedIn");
  };
  const signOut = async () => {
    await tokenStore.clear(); setAccessToken(null);
    setUser(null); setStatus("signedOut");
  };
  const refreshUser = async () => {
    try {
      const { data } = await api.get<User>("/me/");
      setUser(data);
    } catch {
      await signOut();
    }
  };

  return React.createElement(Ctx.Provider, { value: { user, status, signIn, signOut, refreshUser } }, children);
}
