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
  await AsyncStorage.removeItem(KEY_SUS);
}
