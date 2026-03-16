import { BotSession, BotStep, SessionData } from "../types/bot";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

export async function getSession(phoneNumber: string): Promise<BotSession | null> {
  console.log("[Session] Raw fetch getSession for:", phoneNumber);
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bot_sessions?phone_number=eq.${phoneNumber}&limit=1`,
      { headers }
    );
    console.log("[Session] getSession status:", res.status);
    const data = await res.json() as BotSession[];
    console.log("[Session] getSession data:", JSON.stringify(data));
    return data?.[0] ?? null;
  } catch (err) {
    console.error("[Session] getSession error:", err);
    return null;
  }
}

export async function createSession(phoneNumber: string): Promise<BotSession> {
  console.log("[Session] Raw fetch createSession for:", phoneNumber);
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bot_sessions`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone_number: phoneNumber,
          current_step: BotStep.START,
          session_data: {},
        }),
      }
    );
    console.log("[Session] createSession status:", res.status);
    const data = await res.json() as BotSession[];
    console.log("[Session] createSession data:", JSON.stringify(data));
    if (!data?.[0]) throw new Error("No data returned from insert");
    return data[0] as BotSession;
  } catch (err) {
    console.error("[Session] createSession error:", err);
    throw err;
  }
}

export async function updateSession(
  phoneNumber: string,
  step: BotStep,
  sessionData: SessionData,
  candidateId?: string
): Promise<void> {
  console.log("[Session] Raw fetch updateSession for:", phoneNumber, "step:", step);
  const body: Record<string, unknown> = {
    current_step: step,
    session_data: sessionData,
    last_active_at: new Date().toISOString(),
  };
  if (candidateId) body.candidate_id = candidateId;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/bot_sessions?phone_number=eq.${phoneNumber}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify(body),
      }
    );
    console.log("[Session] updateSession status:", res.status);
  } catch (err) {
    console.error("[Session] updateSession error:", err);
    throw err;
  }
}

export async function getOrCreateSession(phoneNumber: string): Promise<BotSession> {
  const existing = await getSession(phoneNumber);
  return existing ?? (await createSession(phoneNumber));
}