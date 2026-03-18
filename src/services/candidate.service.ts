import { supabase } from "./supabase.service";
import { SessionData } from "../types/bot";

export async function saveCandidateFromSession(
  phoneNumber: string,
  data: SessionData
): Promise<string> {

  // ── 1. Create Supabase auth user (phone-based, passwordless) ──────────────
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    phone: phoneNumber,
    phone_confirm: true,
  });
  if (authError && authError.message !== "User already registered") {
    throw new Error(`Auth user creation failed: ${authError.message}`);
  }
  const authUserId = authData?.user?.id;

  // ── 2. Split name into first + surname ────────────────────────────────────
  const nameParts = (data.name ?? "").trim().split(/\s+/);
  const name = nameParts[0] ?? "";
  const surname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  // ── 3. Insert candidate row ───────────────────────────────────────────────
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .insert({
      // Identity
      name,
      surname,
      phone_number: phoneNumber,
      date_of_birth:          data.date_of_birth          ?? null,
      gender:                 data.gender                 ?? null,
      citizenship:            data.citizenship            ?? null,
      // id_number left null — removed from flow

      // Location
      email:                  data.email                  ?? null,
      province_id:            data.province_id            ?? null,
      city:                   data.city                   ?? null,
      address:                data.address                ?? null,

      // Work profile
      industry_id:            data.industry_id            ?? null,
      sub_industry_id:        data.sub_industry_id        ?? null,
      years_experience:       data.years_experience       ?? null,
      education_level:        data.education_level        ?? null,

      // Readiness
      employment_status:      data.employment_status      ?? null,
      availability:           data.availability           ?? null,
      expected_salary:        data.expected_salary        ?? null,
      work_type_id:           data.work_type_id           ?? null,
      willing_to_relocate:    data.willing_to_relocate    ?? false,
      drivers_license:        data.drivers_license        ?? false,
      drivers_license_code_id: data.drivers_license_code_id ?? null,

      // Documents & risk
      criminal_record:        data.criminal_record        ?? false,
      criminal_offence_id:    data.criminal_offence_id    ?? null,
      dismissed_previously:   data.dismissed_previously   ?? false,
      dismissal_reason:       data.dismissal_reason       ?? null,

      // System
      available:    true,
      auth_user_id: authUserId ?? null,
    })
    .select("candidate_id")
    .single();

  if (candidateError || !candidate) {
    throw new Error(`Failed to save candidate: ${candidateError?.message}`);
  }

  const candidateId = candidate.candidate_id as string;

  // ── 4. Insert job titles (junction table) ─────────────────────────────────
  if (data.job_title_ids && data.job_title_ids.length > 0) {
    const jobTitleRows = data.job_title_ids.map((id) => ({
      candidate_id: candidateId,
      job_title_id: id,
      years_experience: data.years_experience ?? null,
    }));
    const { error: jtError } = await supabase
      .from("candidate_job_titles")
      .insert(jobTitleRows);
    if (jtError) {
      console.error("[Candidate] Failed to insert job titles:", jtError.message);
    }
  }

  // ── 5. Insert skills (junction table) ─────────────────────────────────────
  if (data.skill_ids && data.skill_ids.length > 0) {
    const skillRows = data.skill_ids.map((id) => ({
      candidate_id: candidateId,
      skill_id: id,
    }));
    const { error: skillError } = await supabase
      .from("candidate_skills")
      .insert(skillRows);
    if (skillError) {
      console.error("[Candidate] Failed to insert skills:", skillError.message);
    }
  }

  // ── 6. Record status history ──────────────────────────────────────────────
  await supabase.from("candidate_status_history").insert({
    candidate_id: candidateId,
    previous_status: null,
    new_status: "REGISTERED",
    changed_by: "whatsapp_bot",
  });

  return candidateId;
}