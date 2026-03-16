import {
  sendTextMessage,
  sendImageMessage,
  sendButtonMessage,
  sendListMessage,
  downloadMediaBuffer,
} from "./whatsapp.service";
import { updateSession } from "../services/session.service";
import {
  getProvinces,
  getIndustries,
  getJobTitles,
  getDriversLicenseCodes,
  getCriminalOffences,
  chunkArray,
} from "../services/lookup.service";
import { saveCandidateFromSession } from "../services/candidate.service";
import { parseSAID } from "../utils/id.validator";
import { supabase } from "../services/supabase.service";
import { BotSession, BotStep, SessionData, WhatsAppMessage } from "../types/bot";

const WELCOME_IMAGE_URL =
  process.env.JUSTWORK_WELCOME_IMAGE_URL ?? "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg";

// ─── Helper: extract incoming text / button / list reply ───────────────────

function getMessageText(msg: WhatsAppMessage): string {
  if (msg.type === "text") return msg.text?.body?.trim() ?? "";
  if (msg.type === "interactive") {
    return (
      msg.interactive?.button_reply?.id ??
      msg.interactive?.list_reply?.id ??
      ""
    );
  }
  return "";
}

function getMessageLabel(msg: WhatsAppMessage): string {
  if (msg.type === "interactive") {
    return (
      msg.interactive?.button_reply?.title ??
      msg.interactive?.list_reply?.title ??
      ""
    );
  }
  return msg.text?.body?.trim() ?? "";
}

// ─── STEP: START ───────────────────────────────────────────────────────────

export async function handleStart(session: BotSession, _msg: WhatsAppMessage) {
  const { phone_number } = session;

  // Send text instead of image for now
  await sendTextMessage(
    phone_number,
    `👋 Welcome to *JustWork*!\n\nLooking for work? We'll connect you with multiple recruitment companies.\n\n*Don't go looking for work — let the work come to you.*\n\nWhen a recruiter posts a job that fits your qualifications, we send it straight to you. 🚀\n\nReady to start? Tap Register below!`
  );

  await sendButtonMessage(phone_number, "Ready to join the JustWork network?", [
    { id: "REGISTER", title: "Register" },
  ]);

  await updateSession(phone_number, BotStep.WELCOME_SENT, session.session_data);
}

// ─── STEP: WELCOME_SENT → user taps Register ──────────────────────────────

export async function handleWelcomeSent(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (reply !== "REGISTER") {
    await sendButtonMessage(
      session.phone_number,
      "Tap *Register* to get started 👇",
      [{ id: "REGISTER", title: "Register" }]
    );
    return;
  }

  const popiText =
    `📋 *POPI Act — Data Consent*\n\n` +
    `In terms of the Protection of Personal Information Act (POPIA), we need your permission to collect and store your personal information.\n\n` +
    `We will store:\n• Your name, ID number and contact details\n• Your work experience and qualifications\n• Your uploaded documents\n\n` +
    `This information will only be shared with recruitment companies when there is a suitable job match.\n\n` +
    `Do you give your consent?`;

  await sendButtonMessage(session.phone_number, popiText, [
    { id: "POPI_YES", title: "Yes, I agree" },
    { id: "POPI_NO", title: "No, decline" },
  ]);

  await updateSession(session.phone_number, BotStep.POPI_SENT, session.session_data);
}

// ─── STEP: POPI_SENT → user responds ──────────────────────────────────────

export async function handlePopiSent(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);

  if (reply === "POPI_NO") {
    await sendTextMessage(
      session.phone_number,
      `Thank you for your time. We hope to see you again soon! 👋\n\nIf you ever change your mind, just send us a message.`
    );
    await updateSession(
      session.phone_number,
      BotStep.DECLINED,
      { ...session.session_data, popi_accepted: false }
    );
    return;
  }

  if (reply !== "POPI_YES") {
    await sendButtonMessage(
      session.phone_number,
      "Please tap one of the options below to proceed.",
      [
        { id: "POPI_YES", title: "Yes, I agree" },
        { id: "POPI_NO", title: "No, decline" },
      ]
    );
    return;
  }

  await sendTextMessage(
    session.phone_number,
    `Great, thank you! ✅\n\nLet's get you registered. This will take about 2 minutes.\n\n👤 *Step 1 of 8 — Your Name*\n\nPlease enter your *full name* (first name and surname):`
  );

  await updateSession(
    session.phone_number,
    BotStep.ASK_NAME,
    { ...session.session_data, popi_accepted: true }
  );
}

// ─── STEP: ASK_NAME ───────────────────────────────────────────────────────

export async function handleAskName(session: BotSession, msg: WhatsAppMessage) {
  const name = getMessageLabel(msg).trim();

  if (name.split(/\s+/).length < 2) {
    await sendTextMessage(
      session.phone_number,
      "Please enter your *full name* including your surname. Example: _Thabo Nkosi_"
    );
    return;
  }

  await sendTextMessage(
    session.phone_number,
    `Thanks, *${name}*! 👍\n\n🪪 *Step 2 of 8 — ID Number*\n\nPlease enter your *South African ID number* (13 digits):`
  );

  await updateSession(
    session.phone_number,
    BotStep.ASK_ID_NUMBER,
    { ...session.session_data, name }
  );
}

// ─── STEP: ASK_ID_NUMBER ──────────────────────────────────────────────────

export async function handleAskIdNumber(session: BotSession, msg: WhatsAppMessage) {
  const idNumber = getMessageLabel(msg).replace(/\s/g, "");
  const parsed = parseSAID(idNumber);

  if (!parsed.valid) {
    await sendTextMessage(
      session.phone_number,
      `❌ ${parsed.error}\n\nPlease re-enter your *13-digit South African ID number*:`
    );
    return;
  }

  await sendButtonMessage(
    session.phone_number,
    `📱 *Step 3 of 8 — Phone Number*\n\nIs this your correct WhatsApp number?\n*${session.phone_number}*`,
    [
      { id: "PHONE_YES", title: "Yes, that's correct" },
      { id: "PHONE_NO", title: "Use a different number" },
    ]
  );

  await updateSession(
    session.phone_number,
    BotStep.ASK_PHONE_CONFIRM,
    {
      ...session.session_data,
      id_number: idNumber,
      date_of_birth: parsed.dateOfBirth,
      gender: parsed.gender,
    }
  );
}

// ─── STEP: ASK_PHONE_CONFIRM ──────────────────────────────────────────────

export async function handleAskPhoneConfirm(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);

  if (reply === "PHONE_NO") {
    await sendTextMessage(
      session.phone_number,
      "No problem! Please type the phone number you'd like to use (e.g. _0821234567_):"
    );
    await updateSession(
      session.phone_number,
      BotStep.ASK_PHONE_CONFIRM,
      { ...session.session_data, phone_number: undefined }
    );
    return;
  }

  let phone = session.phone_number;
  if (reply !== "PHONE_YES") {
    // They typed a custom number
    const cleaned = getMessageLabel(msg).replace(/\s/g, "");
    if (!/^\+?\d{9,15}$/.test(cleaned)) {
      await sendTextMessage(
        session.phone_number,
        "That doesn't look like a valid phone number. Please try again:"
      );
      return;
    }
    phone = cleaned.startsWith("+") ? cleaned : `+27${cleaned.replace(/^0/, "")}`;
  }

  await sendTextMessage(
    session.phone_number,
    `✉️ *Step 4 of 8 — Email Address (optional)*\n\nPlease enter your email address, or reply *skip* if you don't have one.`
  );

  await updateSession(
    session.phone_number,
    BotStep.ASK_EMAIL,
    { ...session.session_data, phone_number: phone }
  );
}

// ─── STEP: ASK_EMAIL ──────────────────────────────────────────────────────

export async function handleAskEmail(session: BotSession, msg: WhatsAppMessage) {
  const input = getMessageLabel(msg).trim().toLowerCase();
  const email = input === "skip" || input === "" ? undefined : input;

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await sendTextMessage(
      session.phone_number,
      "That doesn't look like a valid email address. Please re-enter it, or reply *skip*:"
    );
    return;
  }

  const provinces = await getProvinces();
  await sendListMessage(
    session.phone_number,
    `📍 *Step 5 of 8 — Location*\n\nWhich province are you in?`,
    "Select province",
    [
      {
        title: "South African Provinces",
        rows: provinces.map((p) => ({ id: `PROV_${p.id}`, title: p.name })),
      },
    ]
  );

  await updateSession(
    session.phone_number,
    BotStep.ASK_PROVINCE,
    { ...session.session_data, email }
  );
}

// ─── STEP: ASK_PROVINCE ───────────────────────────────────────────────────

export async function handleAskProvince(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (!reply.startsWith("PROV_")) {
    const provinces = await getProvinces();
    await sendListMessage(
      session.phone_number,
      "Please select your province from the list:",
      "Select province",
      [
        {
          title: "South African Provinces",
          rows: provinces.map((p) => ({ id: `PROV_${p.id}`, title: p.name })),
        },
      ]
    );
    return;
  }

  const provinceId = parseInt(reply.replace("PROV_", ""), 10);
  const provinceName = getMessageLabel(msg);

  await sendTextMessage(
    session.phone_number,
    `Great, *${provinceName}*! 📍\n\nWhich city or town are you based in? (e.g. _Johannesburg_, _Cape Town_):`
  );

  await updateSession(
    session.phone_number,
    BotStep.ASK_CITY,
    {
      ...session.session_data,
      province_id: provinceId,
      province_name: provinceName,
    }
  );
}

// ─── STEP: ASK_CITY ───────────────────────────────────────────────────────

export async function handleAskCity(session: BotSession, msg: WhatsAppMessage) {
  const city = getMessageLabel(msg).trim();
  if (!city || city.length < 2) {
    await sendTextMessage(
      session.phone_number,
      "Please enter the name of your city or town:"
    );
    return;
  }

  const industries = await getIndustries();
  const chunks = chunkArray(industries, 10);
  const sections = chunks.map((chunk, i) => ({
    title: i === 0 ? "Industries" : `Industries (cont.)`,
    rows: chunk.map((ind) => ({ id: `IND_${ind.id}`, title: ind.name })),
  }));

  await sendListMessage(
    session.phone_number,
    `💼 *Step 6 of 8 — Work Information*\n\nWhich industry do you work in?`,
    "Select industry",
    sections
  );

  await updateSession(
    session.phone_number,
    BotStep.ASK_INDUSTRY,
    { ...session.session_data, city }
  );
}

// ─── STEP: ASK_INDUSTRY ───────────────────────────────────────────────────

export async function handleAskIndustry(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (!reply.startsWith("IND_")) {
    await sendTextMessage(session.phone_number, "Please select your industry from the list.");
    return;
  }

  const industryId = parseInt(reply.replace("IND_", ""), 10);
  const industryName = getMessageLabel(msg);

  const jobTitles = await getJobTitles();
  const chunks = chunkArray(jobTitles, 10);
  const sections = chunks.map((chunk, i) => ({
    title: i === 0 ? "Job Titles" : `Job Titles (cont.)`,
    rows: chunk.map((jt) => ({ id: `JT_${jt.id}`, title: jt.name })),
  }));

  await sendListMessage(
    session.phone_number,
    `What is your job title or the role you are looking for?`,
    "Select job title",
    sections
  );

  await updateSession(
    session.phone_number,
    BotStep.ASK_JOB_TITLE,
    {
      ...session.session_data,
      industry_id: industryId,
      industry_name: industryName,
    }
  );
}

// ─── STEP: ASK_JOB_TITLE ─────────────────────────────────────────────────

export async function handleAskJobTitle(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (!reply.startsWith("JT_")) {
    await (session.phone_number, "Please select your job title from the list.");
    return;
  }

  const jobTitleId = parseInt(reply.replace("JT_", ""), 10);
  const jobTitleName = getMessageLabel(msg);

  const existingIds = session.session_data.job_title_ids ?? [];
  const existingNames = session.session_data.job_title_names ?? [];

  const updatedIds = existingIds.includes(jobTitleId)
    ? existingIds
    : [...existingIds, jobTitleId];
  const updatedNames = existingIds.includes(jobTitleId)
    ? existingNames
    : [...existingNames, jobTitleName];

  await sendButtonMessage(
    session.phone_number,
    `Selected: *${updatedNames.join(", ")}*\n\nWould you like to add another job title?`,
    [
      { id: "JT_ADD_MORE", title: "Add another title" },
      { id: "JT_DONE", title: "Done" },
    ]
  );

  await updateSession(
    session.phone_number,
    BotStep.ASK_JOB_TITLE,
    {
      ...session.session_data,
      job_title_ids: updatedIds,
      job_title_names: updatedNames,
    }
  );
}

// User taps "Done" on job titles — move to experience
export async function handleJobTitleDone(session: BotSession) {
  await sendButtonMessage(
    session.phone_number,
    `⏳ How many years of work experience do you have?`,
    [
      { id: "EXP_0", title: "Less than 1 year" },
      { id: "EXP_1", title: "1–3 years" },
    ]
  );
  // Send a second button message for more options
  await sendButtonMessage(
    session.phone_number,
    "Or:",
    [
      { id: "EXP_3", title: "3–5 years" },
      { id: "EXP_5", title: "5+ years" },
    ]
  );
  await updateSession(session.phone_number, BotStep.ASK_EXPERIENCE, session.session_data);
}

// ─── STEP: ASK_EXPERIENCE ────────────────────────────────────────────────

export async function handleAskExperience(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  const expMap: Record<string, number> = {
    EXP_0: 0,
    EXP_1: 1,
    EXP_3: 3,
    EXP_5: 5,
  };

  if (!expMap.hasOwnProperty(reply)) {
    await sendButtonMessage(session.phone_number, "Please select your years of experience:", [
      { id: "EXP_0", title: "Less than 1 year" },
      { id: "EXP_1", title: "1–3 years" },
    ]);
    return;
  }

  await sendButtonMessage(
    session.phone_number,
    `🚗 *Step 7 of 8 — Driver's Licence*\n\nDo you have a valid driver's licence?`,
    [
      { id: "DL_YES", title: "Yes" },
      { id: "DL_NO", title: "No" },
    ]
  );

  await updateSession(
    session.phone_number,
    BotStep.ASK_DRIVERS_LICENSE,
    { ...session.session_data, years_experience: expMap[reply] }
  );
}

// ─── STEP: ASK_DRIVERS_LICENSE ───────────────────────────────────────────

export async function handleAskDriversLicense(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);

  if (reply === "DL_NO") {
    await sendButtonMessage(
      session.phone_number,
      `📁 *Step 8 of 8 — Documents*\n\nWould you like to upload your CV? This helps recruiters see your full profile.\n(PDF or image)`,
      [
        { id: "CV_UPLOAD", title: "Upload CV" },
        { id: "CV_SKIP", title: "Skip for now" },
      ]
    );
    await updateSession(
      session.phone_number,
      BotStep.ASK_CV_UPLOAD,
      { ...session.session_data, drivers_license: false }
    );
    return;
  }

  if (reply === "DL_YES") {
    const codes = await getDriversLicenseCodes();
    await sendListMessage(
      session.phone_number,
      "Please select your driver's licence code:",
      "Select code",
      [
        {
          title: "Licence Codes",
          rows: codes.map((c) => ({ id: `DLC_${c.id}`, title: c.name })),
        },
      ]
    );
    await updateSession(
      session.phone_number,
      BotStep.ASK_DRIVERS_LICENSE_CODE,
      { ...session.session_data, drivers_license: true }
    );
    return;
  }

  await sendButtonMessage(
    session.phone_number,
    "Please select one of the options below:",
    [
      { id: "DL_YES", title: "Yes" },
      { id: "DL_NO", title: "No" },
    ]
  );
}

// ─── STEP: ASK_DRIVERS_LICENSE_CODE ──────────────────────────────────────

export async function handleAskDriversLicenseCode(
  session: BotSession,
  msg: WhatsAppMessage
) {
  const reply = getMessageText(msg);
  if (!reply.startsWith("DLC_")) {
    await sendTextMessage(session.phone_number, "Please select a licence code from the list.");
    return;
  }

  const codeId = parseInt(reply.replace("DLC_", ""), 10);
  const codeName = getMessageLabel(msg);

  await sendButtonMessage(
    session.phone_number,
    `📁 *Step 8 of 8 — Documents*\n\nWould you like to upload your CV? (PDF or image)`,
    [
      { id: "CV_UPLOAD", title: "Upload CV" },
      { id: "CV_SKIP", title: "Skip for now" },
    ]
  );

  await updateSession(
    session.phone_number,
    BotStep.ASK_CV_UPLOAD,
    {
      ...session.session_data,
      drivers_license_code_id: codeId,
      drivers_license_code: codeName,
    }
  );
}

// ─── STEP: ASK_CV_UPLOAD ─────────────────────────────────────────────────

export async function handleAskCvUpload(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);

  // User tapped "Skip"
  if (reply === "CV_SKIP") {
    return await proceedToCriminalRecord(session);
  }

  // User sent a document or image
  if (msg.type === "document" || msg.type === "image") {
    const mediaId = msg.document?.id ?? msg.image?.id ?? "";
    const filename = msg.document?.filename ?? `cv_${Date.now()}.jpg`;

    try {
      const fileBuffer = await downloadMediaBuffer(mediaId);
      const mimeType = msg.document?.mime_type ?? "image/jpeg";
      const path = `candidates/cv/${session.phone_number}/${filename}`;

      await supabase.storage
        .from("candidate-documents")
        .upload(path, fileBuffer, { contentType: mimeType, upsert: true });

      const { data: urlData } = supabase.storage
        .from("candidate-documents")
        .getPublicUrl(path);

      // Save document reference (will link to candidate_id after registration)
      const { data: docData } = await supabase
        .from("candidate_documents")
        .insert({
          document_type: "CV",
          file_url: urlData.publicUrl,
          file_name: filename,
          file_size_kb: Math.round(fileBuffer.length / 1024),
        })
        .select("document_id")
        .single();

      await updateSession(
        session.phone_number,
        BotStep.ASK_CRIMINAL_RECORD,
        {
          ...session.session_data,
          cv_document_id: docData?.document_id,
        }
      );

      await sendButtonMessage(
        session.phone_number,
        `✅ CV uploaded!\n\n🔍 *Almost done!*\n\nDo you have a criminal record?`,
        [
          { id: "CR_YES", title: "Yes" },
          { id: "CR_NO", title: "No" },
        ]
      );
    } catch {
      await sendTextMessage(
        session.phone_number,
        "Sorry, we couldn't upload your CV. Please try again or tap *Skip*."
      );
      await sendButtonMessage(session.phone_number, "Would you like to try again?", [
        { id: "CV_SKIP", title: "Skip for now" },
      ]);
    }
    return;
  }

  // They tapped "Upload CV" — prompt them to actually send the file
  if (reply === "CV_UPLOAD") {
    await sendTextMessage(
      session.phone_number,
      "Please send your CV as a *PDF* or *image* file now. 📎"
    );
    return;
  }

  await proceedToCriminalRecord(session);
}

async function proceedToCriminalRecord(session: BotSession) {
  await sendButtonMessage(
    session.phone_number,
    `🔍 *Almost done!*\n\nDo you have a criminal record?`,
    [
      { id: "CR_YES", title: "Yes" },
      { id: "CR_NO", title: "No" },
    ]
  );
  await updateSession(session.phone_number, BotStep.ASK_CRIMINAL_RECORD, session.session_data);
}

// ─── STEP: ASK_CRIMINAL_RECORD ───────────────────────────────────────────

export async function handleAskCriminalRecord(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);

  if (reply === "CR_NO") {
    await sendReviewSummary(session, { ...session.session_data, criminal_record: false });
    return;
  }

  if (reply === "CR_YES") {
    const offences = await getCriminalOffences();
    await sendListMessage(
      session.phone_number,
      "Please select the type of offence:",
      "Select offence",
      [
        {
          title: "Offence Types",
          rows: offences.map((o) => ({ id: `OFF_${o.id}`, title: o.name })),
        },
      ]
    );
    await updateSession(
      session.phone_number,
      BotStep.ASK_CRIMINAL_OFFENCE,
      { ...session.session_data, criminal_record: true }
    );
    return;
  }

  await sendButtonMessage(session.phone_number, "Please select one:", [
    { id: "CR_YES", title: "Yes" },
    { id: "CR_NO", title: "No" },
  ]);
}

// ─── STEP: ASK_CRIMINAL_OFFENCE ──────────────────────────────────────────

export async function handleAskCriminalOffence(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (!reply.startsWith("OFF_")) {
    await sendTextMessage(session.phone_number, "Please select an offence from the list.");
    return;
  }

  const offenceId = parseInt(reply.replace("OFF_", ""), 10);
  const offenceName = getMessageLabel(msg);

  const updatedData: SessionData = {
    ...session.session_data,
    criminal_offence_id: offenceId,
    criminal_offence: offenceName,
  };

  await sendReviewSummary(session, updatedData);
}

// ─── REVIEW SUMMARY ───────────────────────────────────────────────────────

async function sendReviewSummary(session: BotSession, data: SessionData) {
  const lines = [
    `📋 *Registration Summary*\n`,
    `👤 *Name:* ${data.name}`,
    `🪪 *ID Number:* ${data.id_number}`,
    `📅 *Date of Birth:* ${data.date_of_birth}`,
    `⚧ *Gender:* ${data.gender}`,
    `📱 *Phone:* ${data.phone_number ?? session.phone_number}`,
    data.email ? `✉️ *Email:* ${data.email}` : `✉️ *Email:* Not provided`,
    `📍 *Province:* ${data.province_name}`,
    `🏙️ *City:* ${data.city}`,
    `🏭 *Industry:* ${data.industry_name}`,
    `💼 *Job Title(s):* ${data.job_title_names?.join(", ")}`,
    `⏳ *Experience:* ${data.years_experience === 0 ? "Less than 1 year" : `${data.years_experience}+ years`}`,
    `🚗 *Driver's Licence:* ${data.drivers_license ? `Yes (${data.drivers_license_code})` : "No"}`,
    `📁 *CV:* ${data.cv_document_id ? "Uploaded ✅" : "Not uploaded"}`,
    `🔍 *Criminal Record:* ${data.criminal_record ? `Yes (${data.criminal_offence})` : "No"}`,
  ];

  await sendTextMessage(session.phone_number, lines.join("\n"));

  await sendButtonMessage(
    session.phone_number,
    "Is all of the above information correct?",
    [
      { id: "CONFIRM_YES", title: "Confirm ✅" },
      { id: "CONFIRM_EDIT", title: "Edit" },
    ]
  );

  await updateSession(session.phone_number, BotStep.REVIEW, data);
}

// ─── STEP: REVIEW ─────────────────────────────────────────────────────────

export async function handleReview(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);

  if (reply === "CONFIRM_EDIT") {
    await sendTextMessage(
      session.phone_number,
      "No problem! Let's start over from the beginning. Type *Hi* to restart."
    );
    await updateSession(session.phone_number, BotStep.START, {});
    return;
  }

  if (reply !== "CONFIRM_YES") {
    await sendButtonMessage(session.phone_number, "Please confirm your registration:", [
      { id: "CONFIRM_YES", title: "Confirm ✅" },
      { id: "CONFIRM_EDIT", title: "Edit" },
    ]);
    return;
  }

  try {
    await sendTextMessage(
      session.phone_number,
      "⏳ Saving your profile, please wait..."
    );

    const candidateId = await saveCandidateFromSession(
      session.session_data.phone_number ?? session.phone_number,
      session.session_data
    );

    await updateSession(session.phone_number, BotStep.COMPLETE, session.session_data, candidateId);

    await sendTextMessage(
      session.phone_number,
      `🎉 *You're in the JustWork network!*\n\nYour profile has been created. When a recruiter posts a job that matches your qualifications, we'll send it straight to you on WhatsApp.\n\nNo need to apply anywhere — the work comes to you! 💪\n\nGood luck, ${session.session_data.name?.split(" ")[0]}! 🚀`
    );
  } catch (err) {
    console.error("[Bot] Failed to save candidate:", err);
    await sendTextMessage(
      session.phone_number,
      "❌ There was an error saving your profile. Please try again by sending *Hi*."
    );
    await updateSession(session.phone_number, BotStep.START, {});
  }
}