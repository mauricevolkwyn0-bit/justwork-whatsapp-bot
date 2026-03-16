import { BotSession, BotStep, WhatsAppMessage } from "../types/bot";
import {
  handleStart,
  handleWelcomeSent,
  handlePopiSent,
  handleAskName,
  handleAskIdNumber,
  handleAskPhoneConfirm,
  handleAskEmail,
  handleAskProvince,
  handleAskCity,
  handleAskIndustry,
  handleAskJobTitle,
  handleJobTitleDone,
  handleAskExperience,
  handleAskDriversLicense,
  handleAskDriversLicenseCode,
  handleAskCvUpload,
  handleAskCriminalRecord,
  handleAskCriminalOffence,
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

  // Re-trigger welcome for any greeting mid-flow,
  // but let COMPLETE and DECLINED handle greetings themselves in the switch
  if (
    current_step !== BotStep.START &&
    current_step !== BotStep.COMPLETE &&
    current_step !== BotStep.DECLINED &&
    GREETING_TRIGGERS.test(text)
  ) {
    return await handleStart(session, msg);
  }

  switch (current_step) {
    case BotStep.START:
      return await handleStart(session, msg);

    case BotStep.WELCOME_SENT:
      return await handleWelcomeSent(session, msg);

    case BotStep.POPI_SENT:
      return await handlePopiSent(session, msg);

    case BotStep.ASK_NAME:
      return await handleAskName(session, msg);

    case BotStep.ASK_ID_NUMBER:
      return await handleAskIdNumber(session, msg);

    case BotStep.ASK_PHONE_CONFIRM:
      return await handleAskPhoneConfirm(session, msg);

    case BotStep.ASK_EMAIL:
      return await handleAskEmail(session, msg);

    case BotStep.ASK_PROVINCE:
      return await handleAskProvince(session, msg);

    case BotStep.ASK_CITY:
      return await handleAskCity(session, msg);

    case BotStep.ASK_INDUSTRY:
      return await handleAskIndustry(session, msg);

    case BotStep.ASK_JOB_TITLE: {
      const reply = text;
      if (reply === "JT_DONE") {
        return await handleJobTitleDone(session);
      }
      if (reply === "JT_ADD_MORE") {
        const { getJobTitles, chunkArray } = await import("../services/lookup.service");
        const { sendListMessage } = await import("../services/whatsapp.service");
        const jobTitles = await getJobTitles();
        const chunks = chunkArray(jobTitles, 10);
        const sections = chunks.map((chunk, i) => ({
          title: i === 0 ? "Job Titles" : "Job Titles (cont.)",
          rows: chunk.map((jt) => ({ id: `JT_${jt.id}`, title: jt.name })),
        }));
        await sendListMessage(
          session.phone_number,
          "Select another job title:",
          "Select job title",
          sections
        );
        return;
      }
      return await handleAskJobTitle(session, msg);
    }

    case BotStep.ASK_EXPERIENCE:
      return await handleAskExperience(session, msg);

    case BotStep.ASK_DRIVERS_LICENSE:
      return await handleAskDriversLicense(session, msg);

    case BotStep.ASK_DRIVERS_LICENSE_CODE:
      return await handleAskDriversLicenseCode(session, msg);

    case BotStep.ASK_CV_UPLOAD:
      return await handleAskCvUpload(session, msg);

    case BotStep.ASK_CRIMINAL_RECORD:
      return await handleAskCriminalRecord(session, msg);

    case BotStep.ASK_CRIMINAL_OFFENCE:
      return await handleAskCriminalOffence(session, msg);

    case BotStep.REVIEW:
      return await handleReview(session, msg);

    case BotStep.COMPLETE:
      // Silently ignore all messages once registration is done
      return;

    case BotStep.DECLINED:
      // Allow declined users to restart by greeting again
      if (GREETING_TRIGGERS.test(text)) {
        return await handleStart(session, msg);
      }
      return;

    default:
      return await handleStart(session, msg);
  }
}