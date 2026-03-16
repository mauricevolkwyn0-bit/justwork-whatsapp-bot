import { supabase } from "./supabase.service";
import { SessionData } from "../types/bot";

export async function saveCandidateFromSession(
  phoneNumber: string,
  data: SessionData
): Promise<string> {
  // 1. Create Supabase auth user (phone-based, passwordless)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    phone: phoneNumber,
    phone_confirm: true,
  });
  if (authError && authError.message !== "User already registered") {
    throw new Error(`Auth user creation failed: ${authError.message}`);
  }
  const authUserId = authData?.user?.id;

  // 2. Insert into candidates table
  const nameParts = (data.name ?? "").trim().split(/\s+/);
  const surname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const name = nameParts[0] ?? "";

  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .insert({
      name,
      surname,
      id_number: data.id_number,
      phone_number: phoneNumber,
      email: data.email ?? null,
      province_id: data.province_id ?? null,
      city: data.city ?? null,
      industry_id: data.industry_id ?? null,
      years_experience: data.years_experience ?? null,
      drivers_license: data.drivers_license ?? false,
      drivers_license_code_id: data.drivers_license_code_id ?? null,
      criminal_record: data.criminal_record ?? false,
      criminal_offence_id: data.criminal_offence_id ?? null,
      date_of_birth: data.date_of_birth ?? null,
      gender: data.gender ?? null,
      available: true,
      auth_user_id: authUserId ?? null,
    })
    .select("candidate_id")
    .single();

  if (candidateError || !candidate) {
    throw new Error(`Failed to save candidate: ${candidateError?.message}`);
  }

  const candidateId = candidate.candidate_id as string;

  // 3. Insert job titles (junction table)
  if (data.job_title_ids && data.job_title_ids.length > 0) {
    const jobTitleRows = data.job_title_ids.map((id) => ({
      candidate_id: candidateId,
      job_title_id: id,
      years_experience: data.years_experience ?? null,
    }));
    await supabase.from("candidate_job_titles").insert(jobTitleRows);
  }

  // 4. Record status history
  await supabase.from("candidate_status_history").insert({
    candidate_id: candidateId,
    previous_status: null,
    new_status: "REGISTERED",
    changed_by: "whatsapp_bot",
  });

  return candidateId;
}