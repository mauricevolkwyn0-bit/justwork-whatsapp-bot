import { BotSession, BotStep, WhatsAppMessage } from "../types/bot";
import {
  handleStart,
  handleWelcomeSent,
  handlePopiSent,
  handleAskName,
  handleAskDob,
  handleAskGender,
  handleAskCitizenship,
  handleAskPhoneConfirm,
  handleAskEmail,
  handleAskProvince,
  handleAskCity,
  handleAskAddress,
  handleAskIndustry,
  handleAskSubIndustry,
  handleAskJobTitle,
  handleJobTitleDone,
  handleAskSkills,
  handleAskExperience,
  handleAskEducation,
  handleAskAvailability,
  handleAskSalary,
  handleAskWorkType,
  handleAskRelocate,
  handleAskDriversLicense,
  handleAskDriversLicenseCode,
  handleAskCvUpload,
  handleAskCriminalRecord,
  handleAskCriminalOffence,
  handleAskDismissal,
  handleReview,
} from "../services/step.handlers";
import { getMessageText } from "../utils/message";

const GREETING_TRIGGERS = /^(hi|hello|good\s?day|hey|howzit|hola|greetings)$/i;

export async function routeMessage(
  session: BotSession,
  msg: WhatsAppMessage
): Promise<void> {
  const { current_step } = session;
  const text = getMessageText(msg);

  if (
    current_step !== BotStep.START &&
    current_step !== BotStep.COMPLETE &&
    current_step !== BotStep.DECLINED &&
    GREETING_TRIGGERS.test(text)
  ) {
    return await handleStart(session, msg);
  }

  switch (current_step) {

    // ── Core ──────────────────────────────────────────────────
    case BotStep.START:
      return await handleStart(session, msg);

    case BotStep.WELCOME_SENT:
      return await handleWelcomeSent(session, msg);

    case BotStep.POPI_SENT:
      return await handlePopiSent(session, msg);

    // ── Identity ──────────────────────────────────────────────
    case BotStep.ASK_NAME:
      return await handleAskName(session, msg);

    case BotStep.ASK_DOB:
      return await handleAskDob(session, msg);

    case BotStep.ASK_GENDER:
      return await handleAskGender(session, msg);

    case BotStep.ASK_CITIZENSHIP:
      return await handleAskCitizenship(session, msg);

    case BotStep.ASK_PHONE_CONFIRM:
      return await handleAskPhoneConfirm(session, msg);

    // ── Location ──────────────────────────────────────────────
    case BotStep.ASK_EMAIL:
      return await handleAskEmail(session, msg);

    case BotStep.ASK_PROVINCE:
      return await handleAskProvince(session, msg);

    case BotStep.ASK_CITY:
      return await handleAskCity(session, msg);

    case BotStep.ASK_ADDRESS:
      return await handleAskAddress(session, msg);

    // ── Work profile ──────────────────────────────────────────
    case BotStep.ASK_INDUSTRY:
      return await handleAskIndustry(session, msg);

    case BotStep.ASK_SUB_INDUSTRY:
      return await handleAskSubIndustry(session, msg);

    case BotStep.ASK_JOB_TITLE: {
      if (text === "JT_DONE") {
        return await handleJobTitleDone(session);
      }
      return await handleAskJobTitle(session, msg);
    }

    case BotStep.ASK_SKILLS: {
      if (text === "SKILLS_ADD_MORE") {
        const { getSkillsByIndustry, chunkArray } = await import("../services/lookup.service");
        const { sendListMessage } = await import("../services/whatsapp.service");
        const industryId = session.session_data.industry_id;
        if (industryId) {
          const skills = await getSkillsByIndustry(industryId);
          const chunks = chunkArray(skills, 9);
          const sections = chunks.map((chunk, i) => ({
            title: i === 0 ? "Skills" : `Skills (${i + 1})`,
            rows: chunk.map((s) => ({ id: `SKILL_${s.id}`, title: s.name })),
          }));
          await sendListMessage(session.phone_number, "Select another skill:", "Select skill", sections);
        }
        return;
      }
      return await handleAskSkills(session, msg);
    }

    case BotStep.ASK_EXPERIENCE:
      return await handleAskExperience(session, msg);

    case BotStep.ASK_EDUCATION:
      return await handleAskEducation(session, msg);

    // ── Readiness ─────────────────────────────────────────────
    case BotStep.ASK_AVAILABILITY:
      return await handleAskAvailability(session, msg);

    case BotStep.ASK_SALARY:
      return await handleAskSalary(session, msg);

    case BotStep.ASK_WORK_TYPE:
      return await handleAskWorkType(session, msg);

    case BotStep.ASK_RELOCATE:
      return await handleAskRelocate(session, msg);

    case BotStep.ASK_DRIVERS_LICENSE:
      return await handleAskDriversLicense(session, msg);

    case BotStep.ASK_DRIVERS_LICENSE_CODE:
      return await handleAskDriversLicenseCode(session, msg);

    // ── Documents & Risk ──────────────────────────────────────
    case BotStep.ASK_CV_UPLOAD:
      return await handleAskCvUpload(session, msg);

    case BotStep.ASK_CRIMINAL_RECORD:
      return await handleAskCriminalRecord(session, msg);

    case BotStep.ASK_CRIMINAL_OFFENCE:
      return await handleAskCriminalOffence(session, msg);

    case BotStep.ASK_DISMISSAL:
      return await handleAskDismissal(session, msg);

    // ── Review & complete ─────────────────────────────────────
    case BotStep.REVIEW:
      return await handleReview(session, msg);

    case BotStep.COMPLETE:
      return;

    case BotStep.DECLINED:
      if (GREETING_TRIGGERS.test(text)) {
        return await handleStart(session, msg);
      }
      return;

    default:
      return await handleStart(session, msg);
  }
}