export enum BotStep {
  START = "START",
  WELCOME_SENT = "WELCOME_SENT",
  POPI_SENT = "POPI_SENT",
  ASK_NAME = "ASK_NAME",
  ASK_ID_NUMBER = "ASK_ID_NUMBER",
  ASK_PHONE_CONFIRM = "ASK_PHONE_CONFIRM",
  ASK_EMAIL = "ASK_EMAIL",
  ASK_PROVINCE = "ASK_PROVINCE",
  ASK_CITY = "ASK_CITY",
  ASK_INDUSTRY = "ASK_INDUSTRY",
  ASK_JOB_TITLE = "ASK_JOB_TITLE",
  ASK_EXPERIENCE = "ASK_EXPERIENCE",
  ASK_DRIVERS_LICENSE = "ASK_DRIVERS_LICENSE",
  ASK_DRIVERS_LICENSE_CODE = "ASK_DRIVERS_LICENSE_CODE",
  ASK_CV_UPLOAD = "ASK_CV_UPLOAD",
  ASK_CRIMINAL_RECORD = "ASK_CRIMINAL_RECORD",
  ASK_CRIMINAL_OFFENCE = "ASK_CRIMINAL_OFFENCE",
  REVIEW = "REVIEW",
  COMPLETE = "COMPLETE",
  DECLINED = "DECLINED",
}

export interface SessionData {
  name?: string | undefined;
  surname?: string | undefined;
  id_number?: string | undefined;
  date_of_birth?: string | undefined;
  gender?: string | undefined;
  phone_number?: string | undefined;
  email?: string | undefined;
  province_id?: number | undefined;
  province_name?: string | undefined;
  city?: string | undefined;
  industry_id?: number | undefined;
  industry_name?: string | undefined;
  job_title_ids?: number[] | undefined;
  job_title_names?: string[] | undefined;
  years_experience?: number | undefined;
  drivers_license?: boolean | undefined;
  drivers_license_code_id?: number | undefined;
  drivers_license_code?: string | undefined;
  cv_document_id?: string | undefined;
  criminal_record?: boolean | undefined;
  criminal_offence_id?: number | undefined;
  criminal_offence?: string | undefined;
  popi_accepted?: boolean | undefined;
}

export interface BotSession {
  session_id: string;
  phone_number: string;
  current_step: BotStep;
  session_data: SessionData;
  candidate_id?: string | undefined;
  last_active_at: string;
  created_at: string;
}

export interface WhatsAppMessage {
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