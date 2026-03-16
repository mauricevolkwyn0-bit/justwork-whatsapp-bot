import { SessionData } from "../types/bot";
 
export async function saveCandidateFromSession(
  phoneNumber: string,
  data: SessionData
): Promise<string> {
  // Supabase disabled — log and return mock ID
  console.log("[Candidate] saveCandidateFromSession (mock) for:", phoneNumber);
  console.log("[Candidate] Session data:", JSON.stringify(data));
  return crypto.randomUUID();
}
 