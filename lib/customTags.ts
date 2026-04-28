// lib/customTags.ts
//
// Persistence for user-defined pressures / replenishers. Plain AsyncStorage,
// one key, JSON-encoded array. Kept deliberately small: the dissertation
// viva is tomorrow and this only needs to survive a restart.

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TagDefinition, TagKind } from "./lifeContext";
import { registerCustomTags } from "./lifeContext";

const STORAGE_KEY = "life_balance_custom_tags_v1";

function slugify(label: string): string {
  const base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return base ? `custom_${base}` : `custom_${Date.now().toString(36)}`;
}

export async function loadCustomTags(): Promise<TagDefinition[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TagDefinition[];
    if (!Array.isArray(parsed)) return [];
    registerCustomTags(parsed);
    return parsed;
  } catch {
    return [];
  }
}

export async function addCustomTag(
  label: string,
  kind: TagKind,
): Promise<TagDefinition | null> {
  const trimmed = label.trim();
  if (!trimmed) return null;
  const existing = await loadCustomTags();
  const id = slugify(trimmed);
  if (existing.some((t) => t.id === id)) {
    return existing.find((t) => t.id === id) ?? null;
  }
  const def: TagDefinition = {
    id,
    kind,
    label: trimmed.slice(0, 40),
    hint: kind === "demand" ? "Your own pressure." : "Your own replenisher.",
  };
  const next = [...existing, def];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  registerCustomTags(next);
  return def;
}

export async function removeCustomTag(id: string): Promise<void> {
  const existing = await loadCustomTags();
  const next = existing.filter((t) => t.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
