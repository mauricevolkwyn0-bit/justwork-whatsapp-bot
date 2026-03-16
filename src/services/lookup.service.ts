// import { supabase } from "./supabase.service";

// export interface LookupRow {
//   id: number;
//   name: string;
// }

// export async function getProvinces(): Promise<LookupRow[]> {
//   const { data } = await supabase
//     .from("provinces")
//     .select("province_id, province_name")
//     .order("province_name");
//   return (data ?? []).map((r) => ({ id: r.province_id, name: r.province_name }));
// }

// export async function getIndustries(): Promise<LookupRow[]> {
//   const { data } = await supabase
//     .from("industries")
//     .select("industry_id, industry_name")
//     .order("industry_name");
//   return (data ?? []).map((r) => ({ id: r.industry_id, name: r.industry_name }));
// }

// export async function getJobTitles(): Promise<LookupRow[]> {
//   const { data } = await supabase
//     .from("job_titles")
//     .select("job_title_id, title_name")
//     .order("title_name");
//   return (data ?? []).map((r) => ({ id: r.job_title_id, name: r.title_name }));
// }

// export async function getDriversLicenseCodes(): Promise<LookupRow[]> {
//   const { data } = await supabase
//     .from("drivers_license_codes")
//     .select("code_id, code_name")
//     .order("code_name");
//   return (data ?? []).map((r) => ({ id: r.code_id, name: r.code_name }));
// }

// export async function getCriminalOffences(): Promise<LookupRow[]> {
//   const { data } = await supabase
//     .from("criminal_offences")
//     .select("offence_id, offence_name")
//     .order("offence_name");
//   return (data ?? []).map((r) => ({ id: r.offence_id, name: r.offence_name }));
// }

// /** Chunk an array into groups of n (WhatsApp list rows max 10 per section) */
// export function chunkArray<T>(arr: T[], n: number): T[][] {
//   const result: T[][] = [];
//   for (let i = 0; i < arr.length; i += n) result.push(arr.slice(i, i + n));
//   return result;
// }

export interface LookupRow {
  id: number;
  name: string;
}

export async function getProvinces(): Promise<LookupRow[]> {
  return [
    { id: 1, name: "Eastern Cape" },
    { id: 2, name: "Free State" },
    { id: 3, name: "Gauteng" },
    { id: 4, name: "KwaZulu-Natal" },
    { id: 5, name: "Limpopo" },
    { id: 6, name: "Mpumalanga" },
    { id: 7, name: "North West" },
    { id: 8, name: "Northern Cape" },
    { id: 9, name: "Western Cape" },
  ];
}

export async function getIndustries(): Promise<LookupRow[]> {
  return [
    { id: 1, name: "Mining" },
    { id: 2, name: "Construction" },
    { id: 3, name: "Manufacturing" },
    { id: 4, name: "Retail" },
    { id: 5, name: "Agriculture" },
    { id: 6, name: "Transport & Logistics" },
    { id: 7, name: "Hospitality" },
    { id: 8, name: "Healthcare" },
    { id: 9, name: "Information Technology" },
    { id: 10, name: "Finance & Insurance" },
  ];
}

export async function getJobTitles(): Promise<LookupRow[]> {
  return [
    { id: 1, name: "General Worker" },
    { id: 2, name: "Artisan" },
    { id: 3, name: "Supervisor" },
    { id: 4, name: "Driver" },
    { id: 5, name: "Security Guard" },
    { id: 6, name: "Cleaner" },
    { id: 7, name: "Electrician" },
    { id: 8, name: "Plumber" },
    { id: 9, name: "Welder" },
    { id: 10, name: "Machine Operator" },
  ];
}

export async function getDriversLicenseCodes(): Promise<LookupRow[]> {
  return [
    { id: 1, name: "A" },
    { id: 2, name: "A1" },
    { id: 3, name: "B" },
    { id: 4, name: "C" },
    { id: 5, name: "C1" },
    { id: 6, name: "EB" },
    { id: 7, name: "EC" },
    { id: 8, name: "EC1" },
  ];
}

export async function getCriminalOffences(): Promise<LookupRow[]> {
  return [
    { id: 1, name: "Theft" },
    { id: 2, name: "Assault" },
    { id: 3, name: "Fraud" },
    { id: 4, name: "Drug-related offence" },
    { id: 5, name: "Other" },
  ];
}

export function chunkArray<T>(arr: T[], n: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += n) result.push(arr.slice(i, i + n));
  return result;
}