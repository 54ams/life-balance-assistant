import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SusResponse } from "./sus";
import { computeSusScore } from "./sus";

const KEY_SUS = "life_balance_sus_responses_v1";
const KEY_PID = "life_balance_participant_id_v1";

export type SusSubmission = {
  id: string;
  participantId: string;
  createdAt: string; // ISO
  responses: SusResponse[];
  score: number; // 0-100
  feedback?: string;
  appVersion?: string;
};

function uid(): string {
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

export async function getOrCreateParticipantId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEY_PID);
  if (existing) return existing;
  const pid = "P-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  await AsyncStorage.setItem(KEY_PID, pid);
  return pid;
}

export async function listSusSubmissions(): Promise<SusSubmission[]> {
  const raw = await AsyncStorage.getItem(KEY_SUS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SusSubmission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function save(list: SusSubmission[]) {
  await AsyncStorage.setItem(KEY_SUS, JSON.stringify(list));
}

export async function addSusSubmission(args: {
  participantId: string;
  responses: SusResponse[];
  feedback?: string;
  appVersion?: string;
}): Promise<SusSubmission> {
  const score = computeSusScore(args.responses);
  const sub: SusSubmission = {
    id: uid(),
    participantId: args.participantId,
    createdAt: new Date().toISOString(),
    responses: args.responses,
    score,
    feedback: args.feedback?.trim() ? args.feedback.trim() : undefined,
    appVersion: args.appVersion,
  };
  const list = await listSusSubmissions();
  list.unshift(sub);
  await save(list);
  return sub;
}

export async function clearSusSubmissions(): Promise<void> {
  await AsyncStorage.multiRemove([KEY_SUS, KEY_PID]);
}

export function filterSusByRetention(
  list: SusSubmission[],
  retainDays: number,
  now = new Date()
): SusSubmission[] {
  if (retainDays <= 0) return [];
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - retainDays + 1);
  const cutoffTs = cutoff.getTime();
  return list.filter((s) => {
    const t = Date.parse(s.createdAt);
    return Number.isFinite(t) && t >= cutoffTs;
  });
}

export async function purgeOldSusSubmissions(retainDays: number): Promise<number> {
  const all = await listSusSubmissions();
  const kept = filterSusByRetention(all, retainDays);
  await save(kept);
  return Math.max(0, all.length - kept.length);
}
