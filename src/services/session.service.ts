import { supabase } from "./supabase.service";
import { BotSession, BotStep, SessionData } from "../types/bot";

export async function getSession(phoneNumber: string): Promise<BotSession | null> {
  console.log("[Session] Querying bot_sessions for:", phoneNumber);
  const { data, error } = await supabase
    .from("bot_sessions")
    .select("*")
    .eq("phone_number", phoneNumber)
    .maybeSingle();
  console.log("[Session] Query result — data:", !!data, "error:", error?.message);
  if (error) {
    console.error("[Session] getSession error:", error.message);
    return null;
  }
  return data as BotSession | null;
}

export async function createSession(phoneNumber: string): Promise<BotSession> {
  console.log("[Session] Creating new session for:", phoneNumber);
  const { data, error } = await supabase
    .from("bot_sessions")
    .insert({
      phone_number: phoneNumber,
      current_step: BotStep.START,
      session_data: {},
    })
    .select()
    .single();
  if (error || !data) {
    console.error("[Session] createSession error:", error?.message);
    throw new Error(`Failed to create session: ${error?.message}`);
  }
  console.log("[Session] Session created:", data.session_id);
  return data as BotSession;
}

export async function updateSession(
  phoneNumber: string,
  step: BotStep,
  sessionData: SessionData,
  candidateId?: string
): Promise<void> {
  const update: Record<string, unknown> = {
    current_step: step,
    session_data: sessionData,
    last_active_at: new Date().toISOString(),
  };
  if (candidateId) update.candidate_id = candidateId;

  const { error } = await supabase
    .from("bot_sessions")
    .update(update)
    .eq("phone_number", phoneNumber);

  if (error) throw new Error(`Failed to update session: ${error.message}`);
}

export async function getOrCreateSession(phoneNumber: string): Promise<BotSession> {
  const existing = await getSession(phoneNumber);
  return existing ?? (await createSession(phoneNumber));
}