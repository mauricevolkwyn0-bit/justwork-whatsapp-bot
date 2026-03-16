import { supabase } from "./supabase.service";

export interface LookupRow {
  id: number;
  name: string;
}

export async function getProvinces(): Promise<LookupRow[]> {
  const { data } = await supabase
    .from("provinces")
    .select("province_id, province_name")
    .order("province_name");
  return (data ?? []).map((r) => ({ id: r.province_id, name: r.province_name }));
}

export async function getIndustries(): Promise<LookupRow[]> {
  const { data } = await supabase
    .from("industries")
    .select("industry_id, industry_name")
    .order("industry_name");
  return (data ?? []).map((r) => ({ id: r.industry_id, name: r.industry_name }));
}

export async function getJobTitles(): Promise<LookupRow[]> {
  const { data } = await supabase
    .from("job_titles")
    .select("job_title_id, title_name")
    .order("title_name");
  return (data ?? []).map((r) => ({ id: r.job_title_id, name: r.title_name }));
}

export async function getDriversLicenseCodes(): Promise<LookupRow[]> {
  const { data } = await supabase
    .from("drivers_license_codes")
    .select("code_id, code_name")
    .order("code_name");
  return (data ?? []).map((r) => ({ id: r.code_id, name: r.code_name }));
}

export async function getCriminalOffences(): Promise<LookupRow[]> {
  const { data } = await supabase
    .from("criminal_offences")
    .select("offence_id, offence_name")
    .order("offence_name");
  return (data ?? []).map((r) => ({ id: r.offence_id, name: r.offence_name }));
}

/** Chunk an array into groups of n (WhatsApp list rows max 10 per section) */
export function chunkArray<T>(arr: T[], n: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += n) result.push(arr.slice(i, i + n));
  return result;
}