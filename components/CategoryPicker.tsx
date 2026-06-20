import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import { TextField } from "./TextField";
import { Button } from "./Button";
import type { Category, CategoryKind } from "../lib/ledger";

export function CategoryPicker({ categories, value, onChange, onAdd, kind }:
  { categories: Category[]; value: string | null; onChange: (id: string) => void;
    onAdd: (name: string) => Promise<Category>; kind: CategoryKind }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const add = async () => { if (!name.trim()) return; const c = await onAdd(name.trim()); onChange(c.id); setName(""); setAdding(false); };
  return (
    <View className="gap-2">
      <Text className="text-text-muted text-sm">Category</Text>
      <View className="flex-row flex-wrap gap-2">
        {categories.map((c) => (
          <Pressable key={c.id} onPress={() => onChange(c.id)}
            className={`px-3 py-2 rounded-full border ${value === c.id ? "bg-mint border-primary" : "bg-surface border-border"}`}>
            <Text className={value === c.id ? "text-primary-dark" : "text-text-muted"}>{c.name}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setAdding((v) => !v)} className="px-3 py-2 rounded-full border border-dashed border-primary">
          <Text className="text-primary">+ Add</Text>
        </Pressable>
      </View>
      {adding && (
        <View className="gap-2">
          <TextField label="New category" value={name} onChangeText={setName} placeholder="e.g. Internet" />
          <Button label="Add category" onPress={add} />
        </View>
      )}
    </View>
  );
}
