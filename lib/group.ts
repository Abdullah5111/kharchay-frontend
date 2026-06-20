import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import * as SecureStore from "expo-secure-store";

const KEY = "kharchay.selectedGroup";
type Ctx = { groupId: string | null; setGroupId: (id: string | null) => void };
const GroupCtx = createContext<Ctx | null>(null);

export function SelectedGroupProvider({ children }: { children: React.ReactNode }) {
  const [groupId, setGroupIdState] = useState<string | null>(null);
  useEffect(() => {
    SecureStore.getItemAsync(KEY).then((v) => { if (v) setGroupIdState(v); }).catch(console.error);
  }, []);
  const setGroupId = useCallback((id: string | null) => {
    setGroupIdState(id);
    if (id) SecureStore.setItemAsync(KEY, id).catch(console.error);
    else SecureStore.deleteItemAsync(KEY).catch(console.error);
  }, []);
  const value = useMemo(() => ({ groupId, setGroupId }), [groupId, setGroupId]);
  return React.createElement(GroupCtx.Provider, { value }, children);
}

export function useSelectedGroup() {
  const v = useContext(GroupCtx);
  if (!v) throw new Error("useSelectedGroup must be inside SelectedGroupProvider");
  return v;
}
