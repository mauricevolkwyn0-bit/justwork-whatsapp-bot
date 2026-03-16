import { BotSession, BotStep, SessionData } from "../types/bot";

// In-memory store — resets on each Vercel cold start
const sessions = new Map<string, BotSession>();

export async function getSession(phoneNumber: string): Promise<BotSession | null> {
  console.log("[Session] getSession (mock) for:", phoneNumber);
  return sessions.get(phoneNumber) ?? null;
}

export async function createSession(phoneNumber: string): Promise<BotSession> {
  console.log("[Session] createSession (mock) for:", phoneNumber);
  const session: BotSession = {
    session_id: crypto.randomUUID(),
    phone_number: phoneNumber,
    current_step: BotStep.START,
    session_data: {},
    last_active_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  sessions.set(phoneNumber, session);
  return session;
}

export async function updateSession(
  phoneNumber: string,
  step: BotStep,
  sessionData: SessionData,
  candidateId?: string
): Promise<void> {
  console.log("[Session] updateSession (mock) for:", phoneNumber, "step:", step);
  const existing = sessions.get(phoneNumber);
  if (existing) {
    existing.current_step = step;
    existing.session_data = sessionData;
    existing.last_active_at = new Date().toISOString();
    if (candidateId) existing.candidate_id = candidateId;
  }
}

export async function getOrCreateSession(phoneNumber: string): Promise<BotSession> {
  const existing = await getSession(phoneNumber);
  return existing ?? (await createSession(phoneNumber));
}