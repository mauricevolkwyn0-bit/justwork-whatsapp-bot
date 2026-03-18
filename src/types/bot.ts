export enum BotStep {
  // ── Core ──────────────────────────────────────────────────
  START = "START",
  WELCOME_SENT = "WELCOME_SENT",

  // ── POPI consent ───────────────────────────────────────────
  POPI_SENT = "POPI_SENT",
  DECLINED = "DECLINED",

  // ── Identity ───────────────────────────────────────────────
  ASK_NAME = "ASK_NAME",
  ASK_DOB = "ASK_DOB",
  ASK_GENDER = "ASK_GENDER",
  ASK_CITIZENSHIP = "ASK_CITIZENSHIP",
  ASK_PHONE_CONFIRM = "ASK_PHONE_CONFIRM",

  // ── Location ───────────────────────────────────────────────
  ASK_EMAIL = "ASK_EMAIL",
  ASK_PROVINCE = "ASK_PROVINCE",
  ASK_CITY = "ASK_CITY",
  ASK_ADDRESS = "ASK_ADDRESS",

  // ── Work profile ───────────────────────────────────────────
  ASK_INDUSTRY = "ASK_INDUSTRY",
  ASK_SUB_INDUSTRY = "ASK_SUB_INDUSTRY",
  ASK_JOB_TITLE = "ASK_JOB_TITLE",
  ASK_SKILLS = "ASK_SKILLS",
  ASK_EXPERIENCE = "ASK_EXPERIENCE",
  ASK_EDUCATION = "ASK_EDUCATION",

  // ── Readiness ──────────────────────────────────────────────
  ASK_AVAILABILITY = "ASK_AVAILABILITY",
  ASK_SALARY = "ASK_SALARY",
  ASK_WORK_TYPE = "ASK_WORK_TYPE",
  ASK_RELOCATE = "ASK_RELOCATE",
  ASK_DRIVERS_LICENSE = "ASK_DRIVERS_LICENSE",
  ASK_DRIVERS_LICENSE_CODE = "ASK_DRIVERS_LICENSE_CODE",

  // ── Documents & Risk ───────────────────────────────────────
  ASK_CV_UPLOAD = "ASK_CV_UPLOAD",
  ASK_CRIMINAL_RECORD = "ASK_CRIMINAL_RECORD",
  ASK_CRIMINAL_OFFENCE = "ASK_CRIMINAL_OFFENCE",
  ASK_DISMISSAL = "ASK_DISMISSAL",

  // ── Review & complete ──────────────────────────────────────
  REVIEW = "REVIEW",
  COMPLETE = "COMPLETE",
}

// exactOptionalPropertyTypes requires explicit `| undefined` on every optional field
export interface SessionData {
  // Identity
  name?: string | undefined;
  surname?: string | undefined;
  date_of_birth?: string | undefined;
  gender?: string | undefined;
  citizenship?: string | undefined;
  phone_number?: string | undefined;
  popi_accepted?: boolean | undefined;

  // Location
  email?: string | undefined;
  province_id?: number | undefined;
  province_name?: string | undefined;
  city?: string | undefined;
  address?: string | undefined;

  // Work profile
  industry_id?: number | undefined;
  industry_name?: string | undefined;
  sub_industry_id?: number | undefined;
  sub_industry_name?: string | undefined;
  job_title_ids?: number[] | undefined;
  job_title_names?: string[] | undefined;
  skill_ids?: number[] | undefined;
  skill_names?: string[] | undefined;
  years_experience?: number | undefined;
  education_level?: string | undefined;

  // Readiness
  employment_status?: string | undefined;
  availability?: string | undefined;
  expected_salary?: number | undefined;
  work_type_id?: number | undefined;
  work_type_name?: string | undefined;
  willing_to_relocate?: boolean | undefined;
  drivers_license?: boolean | undefined;
  drivers_license_code_id?: number | undefined;
  drivers_license_code?: string | undefined;

  // Documents & risk
  cv_document_id?: string | undefined;
  criminal_record?: boolean | undefined;
  criminal_offence_id?: number | undefined;
  criminal_offence?: string | undefined;
  dismissed_previously?: boolean | undefined;
  dismissal_reason?: string | undefined;
}

export interface BotSession {
  session_id: string;
  phone_number: string;
  current_step: BotStep;
  session_data: SessionData;
  candidate_id?: string | undefined;
  last_active_at: string;
  created_at: string;
  popi_status?: string | undefined;
  popi_declined_at?: string | undefined;
}

export interface WhatsAppMessage {
  id?: string | undefined;
  from: string;
  type: "text" | "interactive" | "document" | "image";
  text?: { body: string };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string };
  };
  document?: {
    id: string;
    filename: string;
    mime_type: string;
  };
  image?: {
    id: string;
    mime_type: string;
  };
}

export interface WhatsAppWebhookBody {
  object: string;
  entry: Array<{
    changes: Array<{
      value: {
        messages?: WhatsAppMessage[];
        statuses?: unknown[];
      };
    }>;
  }>;
}