import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { supabase } from "@/src/supabase/client";

export const isCloudConfigured = true;

export interface AuthUser {
  uid: string;
  email: string | null;
}

type UserDataRow = {
  user_id: string;
  key: string;
  payload: unknown;
  updated_at: string;
};

type SquadRow = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  members: SquadMemberDoc[];
};

function rowToSquadDoc(row: SquadRow): SquadDoc {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    createdAt: row.created_at,
    members: row.members ?? [],
  };
}

type SupabaseLikeError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function formatSquadBackendError(error: SupabaseLikeError): Error {
  const code = error.code ?? "";
  const message = error.message ?? "";
  const normalized = `${code} ${message}`.toLowerCase();

  if (code === "PGRST205" || normalized.includes("schema cache")) {
    return new Error(
      "Squad backend is not initialized in Supabase. Run artifacts/rai/supabase/compat-schema.sql in SQL Editor, then expose public.squads in Data API settings.",
    );
  }

  if (code === "42501" || normalized.includes("permission denied")) {
    return new Error(
      "Squad backend permissions are missing. Apply the RLS policies in artifacts/rai/supabase/compat-schema.sql.",
    );
  }

  if (code === "23505" || normalized.includes("duplicate key")) {
    return new Error("Invite code collision. Please try creating the squad again.");
  }

  if (message) return new Error(message);
  return new Error("Squad backend request failed.");
}

/**
 * Compresses a local image URI to 200×200 JPEG and returns a base64 data URI.
 */
export async function encodeProfilePhoto(localUri: string): Promise<string> {
  const result = await manipulateAsync(
    localUri,
    [{ resize: { width: 200, height: 200 } }],
    { compress: 0.5, format: SaveFormat.JPEG, base64: true },
  );
  if (!result.base64) throw new Error("Image encoding failed");
  return `data:image/jpeg;base64,${result.base64}`;
}

function sanitize(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitize);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v !== undefined) out[k] = sanitize(v);
  }
  return out;
}

export async function firestoreSet(userId: string, key: string, data: unknown): Promise<void> {
  if (data === null) {
    const { error } = await supabase
      .from("user_data")
      .delete()
      .eq("user_id", userId)
      .eq("key", key);
    if (error) throw error;
    return;
  }

  const row: UserDataRow = {
    user_id: userId,
    key,
    payload: sanitize(data),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("user_data")
    .upsert(row, { onConflict: "user_id,key" });
  if (error) throw error;
}

export async function firestoreGet<T>(userId: string, key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("user_data")
    .select("payload")
    .eq("user_id", userId)
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return (data?.payload as T | null) ?? null;
}

export async function firestoreGetAll(userId: string, keys: string[]): Promise<Record<string, unknown>> {
  const { data, error } = await supabase
    .from("user_data")
    .select("key,payload")
    .eq("user_id", userId)
    .in("key", keys);
  if (error) throw error;

  const result: Record<string, unknown> = {};
  for (const row of data ?? []) {
    result[row.key as string] = row.payload;
  }
  return result;
}

export async function firestoreSetAll(userId: string, data: Record<string, unknown>): Promise<void> {
  const writes = Object.entries(data).map(([key, payload]) => firestoreSet(userId, key, payload));
  await Promise.all(writes);
}

/**
 * Subscribe to a user data document in real-time.
 * Returns unsubscribe function.
 */
export function firestoreSubscribe<T>(
  userId: string,
  key: string,
  onData: (data: T) => void,
): () => void {
  const channel = supabase
    .channel(`user_data:${userId}:${key}:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "user_data", filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.eventType === "DELETE") return;
        const row = payload.new as { key?: string; payload?: unknown };
        if (row.key !== key) return;
        if (row.payload !== undefined && row.payload !== null) onData(row.payload as T);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export interface SquadDoc {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  members: SquadMemberDoc[];
}

export interface SquadMemberDoc {
  uid: string;
  name: string;
  raiScore: number;
  xp: number;
  streak: number;
  avatarColor: string;
  avatarUrl?: string;
  lastActive: string;
}

function randomCode(): string {
  return Math.random().toString(36).toUpperCase().slice(2, 8);
}

const AVATAR_COLORS = ["#6366F1", "#10B981", "#F97316", "#EC4899", "#F59E0B", "#3B82F6", "#8B5CF6", "#EF4444"];
export function uidToColor(uid: string): string {
  let hash = 0;
  for (const c of uid) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export async function createSquad(params: {
  squadName: string;
  creatorUid: string;
  creatorName: string;
  creatorRaiScore: number;
  creatorXP: number;
  creatorStreak: number;
  creatorAvatarUrl?: string;
}): Promise<SquadDoc> {
  const member: SquadMemberDoc = {
    uid: params.creatorUid,
    name: params.creatorName,
    raiScore: params.creatorRaiScore,
    xp: params.creatorXP,
    streak: params.creatorStreak,
    avatarColor: uidToColor(params.creatorUid),
    avatarUrl: params.creatorAvatarUrl,
    lastActive: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const row: SquadRow = {
      id: `sq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: params.squadName,
      invite_code: randomCode(),
      created_by: params.creatorUid,
      created_at: new Date().toISOString(),
      members: [member],
    };

    const { error: squadError } = await supabase.from("squads").insert(row);
    if (!squadError) return rowToSquadDoc(row);

    if (squadError.code === "23505") continue;
    throw formatSquadBackendError(squadError);
  }

  throw new Error("Could not generate a unique invite code. Try again.");
}

export async function joinSquad(params: {
  inviteCode: string;
  memberUid: string;
  memberName: string;
  memberRaiScore: number;
  memberXP: number;
  memberStreak: number;
  memberAvatarUrl?: string;
}): Promise<SquadDoc | null> {
  const invite = params.inviteCode.toUpperCase();
  const { data: squadData, error: squadError } = await supabase
    .from("squads")
    .select("id,name,invite_code,created_by,created_at,members")
    .eq("invite_code", invite)
    .maybeSingle();
  if (squadError) throw formatSquadBackendError(squadError);
  if (!squadData) return null;

  const squad = rowToSquadDoc(squadData as SquadRow);
  if (squad.members.some((m) => m.uid === params.memberUid)) return squad;

  const newMember: SquadMemberDoc = {
    uid: params.memberUid,
    name: params.memberName,
    raiScore: params.memberRaiScore,
    xp: params.memberXP,
    streak: params.memberStreak,
    avatarColor: uidToColor(params.memberUid),
    avatarUrl: params.memberAvatarUrl,
    lastActive: new Date().toISOString(),
  };
  const nextMembers = [...squad.members, newMember];

  const { error: updateError } = await supabase
    .from("squads")
    .update({ members: nextMembers })
    .eq("id", squad.id);
  if (updateError) throw formatSquadBackendError(updateError);

  return { ...squad, members: nextMembers };
}

export async function updateSquadMember(
  squadId: string,
  uid: string,
  updates: Partial<Omit<SquadMemberDoc, "uid">>,
): Promise<void> {
  const { data, error } = await supabase
    .from("squads")
    .select("id,name,invite_code,created_by,created_at,members")
    .eq("id", squadId)
    .maybeSingle();
  if (error) throw formatSquadBackendError(error);
  if (!data) return;

  const squad = rowToSquadDoc(data as SquadRow);
  const newMembers = squad.members.map((m) =>
    m.uid === uid ? { ...m, ...updates, lastActive: new Date().toISOString() } : m,
  );

  const { error: updateError } = await supabase
    .from("squads")
    .update({ members: newMembers })
    .eq("id", squadId);
  if (updateError) throw formatSquadBackendError(updateError);
}

export function listenToSquad(squadId: string, onData: (squad: SquadDoc) => void): () => void {
  const channel = supabase
    .channel(`squad:${squadId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "squads", filter: `id=eq.${squadId}` },
      (payload) => {
        if (payload.eventType === "DELETE") return;
        const row = payload.new as SquadRow;
        onData(rowToSquadDoc(row));
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
