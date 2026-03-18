import {
  sendTextMessage,
  sendButtonMessage,
  sendListMessage,
  sendInteractiveWithImageHeader,
  downloadMediaBuffer,
} from "./whatsapp.service";
import { updateSession } from "../services/session.service";
import {
  getProvinces,
  getIndustries,
  getSubIndustries,
  getJobTitles,
  getSkillsByIndustry,
  getJobTypes,
  getDriversLicenseCodes,
  getCriminalOffences,
} from "../services/lookup.service";
import { saveCandidateFromSession } from "../services/candidate.service";
import { BotSession, BotStep, SessionData, WhatsAppMessage } from "../types/bot";

const WELCOME_IMAGE_URL =
  process.env.JUSTWORK_WELCOME_IMAGE_URL ??
  "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg";

// ─── WhatsApp hard limit: 10 total rows across ALL sections ───────────────
function limitList(items: Array<{ id: string; title: string }>) {
  return items.slice(0, 10);
}

async function safeListMessage(
  phone: string,
  body: string,
  buttonLabel: string,
  title: string,
  rows: Array<{ id: string; title: string }>,
  caller: string
) {
  const limited = rows.slice(0, 10);
  console.log(`[LIST:${caller}] total=${rows.length} sending=${limited.length}`);
  if (rows.length > 10) {
    console.warn(`[LIST:${caller}] WARNING: truncated from ${rows.length} to 10`);
  }
  return sendListMessage(phone, body, buttonLabel, [{ title, rows: limited }]);
}

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

// ─── STEP 1: START ────────────────────────────────────────────────────────

export async function handleStart(session: BotSession, _msg: WhatsAppMessage) {
  await sendInteractiveWithImageHeader(
    session.phone_number,
    WELCOME_IMAGE_URL,
    `Welcome to *Just Work*!\n\nLooking for work? We'll connect you with multiple recruitment companies.\n\n*Don't go looking for work — let the work come to you.*\n\nWhen a recruiter posts a job that fits your qualifications, we send it straight to you.\n\nReady to start? Tap Register below!`,
    [{ id: "REGISTER", title: "Register" }]
  );
  await updateSession(session.phone_number, BotStep.WELCOME_SENT, session.session_data);
}

// ─── STEP 2: WELCOME_SENT ─────────────────────────────────────────────────

export async function handleWelcomeSent(session: BotSession, msg: WhatsAppMessage) {
  if (getMessageText(msg) !== "REGISTER") {
    await sendButtonMessage(session.phone_number, "Tap *Register* to get started 👇", [
      { id: "REGISTER", title: "Register" },
    ]);
    return;
  }
  await sendButtonMessage(
    session.phone_number,
    `📋 *POPI Act — Data Consent*\n\nIn terms of the Protection of Personal Information Act (POPIA), we need your permission to collect and store your personal information.\n\nWe will store:\n• Your name and contact details\n• Your work experience and qualifications\n• Your uploaded documents\n\nThis information will only be shared with recruitment companies when there is a suitable job match.\n\nDo you give your consent?`,
    [
      { id: "POPI_YES", title: "Yes, I agree" },
      { id: "POPI_NO", title: "No, decline" },
    ]
  );
  await updateSession(session.phone_number, BotStep.POPI_SENT, session.session_data);
}

// ─── STEP 3: POPI_SENT ────────────────────────────────────────────────────

export async function handlePopiSent(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (reply === "POPI_NO") {
    await sendTextMessage(session.phone_number, `We respect your decision. Your information has not been stored.\n\nIf you change your mind in future, just send us a message. 👋`);
    await updateSession(session.phone_number, BotStep.DECLINED, { ...session.session_data, popi_accepted: false });
    return;
  }
  if (reply !== "POPI_YES") {
    await sendButtonMessage(session.phone_number, "Please tap one of the options below to proceed.", [
      { id: "POPI_YES", title: "Yes, I agree" },
      { id: "POPI_NO", title: "No, decline" },
    ]);
    return;
  }
  await sendTextMessage(session.phone_number, `Great, thank you! ✅\n\nLet's get you registered. This will only take a few minutes.\n\n👤 *Your Name*\n\nPlease enter your *full name* (first name and surname):`);
  await updateSession(session.phone_number, BotStep.ASK_NAME, { ...session.session_data, popi_accepted: true });
}

// ─── STEP 4: ASK_NAME ─────────────────────────────────────────────────────

export async function handleAskName(session: BotSession, msg: WhatsAppMessage) {
  const name = getMessageLabel(msg).trim();
  if (name.split(/\s+/).length < 2) {
    await sendTextMessage(session.phone_number, "Please enter your *full name* including your surname.\nExample: _Thabo Nkosi_");
    return;
  }
  await sendTextMessage(session.phone_number, `Thanks, *${name}*! 👍\n\n📅 *Date of Birth*\n\nPlease enter your date of birth.\nExample: _15 March 1990_ or _15/03/1990_`);
  await updateSession(session.phone_number, BotStep.ASK_DOB, { ...session.session_data, name });
}

// ─── STEP 5a: ASK_DOB ─────────────────────────────────────────────────────

export async function handleAskDob(session: BotSession, msg: WhatsAppMessage) {
  const input = getMessageLabel(msg).trim();
  const parsed = new Date(input);
  const isValid = !isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < new Date().getFullYear();
  if (!isValid) {
    await sendTextMessage(session.phone_number, "That doesn't look like a valid date. Please try again.\nExample: _15 March 1990_ or _15/03/1990_");
    return;
  }
  const dob = parsed.toISOString().split("T")[0];
  await sendButtonMessage(session.phone_number, `⚧ *Gender*\n\nPlease select your gender:`, [
    { id: "GENDER_MALE", title: "Male" },
    { id: "GENDER_FEMALE", title: "Female" },
    { id: "GENDER_PREFER_NOT", title: "Prefer not to say" },
  ]);
  await updateSession(session.phone_number, BotStep.ASK_GENDER, { ...session.session_data, date_of_birth: dob });
}

// ─── STEP 5b: ASK_GENDER ──────────────────────────────────────────────────

export async function handleAskGender(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  const genderMap: Record<string, string> = { GENDER_MALE: "Male", GENDER_FEMALE: "Female", GENDER_PREFER_NOT: "Prefer not to say" };
  const gender = genderMap[reply];
  if (!gender) {
    await sendButtonMessage(session.phone_number, "Please select your gender:", [
      { id: "GENDER_MALE", title: "Male" },
      { id: "GENDER_FEMALE", title: "Female" },
      { id: "GENDER_PREFER_NOT", title: "Prefer not to say" },
    ]);
    return;
  }
  await sendButtonMessage(session.phone_number, `🌍 *Citizenship*\n\nWhat is your citizenship status?`, [
    { id: "CIT_SA", title: "SA Citizen" },
    { id: "CIT_PR", title: "Permanent Resident" },
    { id: "CIT_PERMIT", title: "Work Permit" },
  ]);
  await updateSession(session.phone_number, BotStep.ASK_CITIZENSHIP, { ...session.session_data, gender });
}

// ─── STEP 5c: ASK_CITIZENSHIP ─────────────────────────────────────────────

export async function handleAskCitizenship(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  const citizenshipMap: Record<string, string> = { CIT_SA: "SA Citizen", CIT_PR: "Permanent Resident", CIT_PERMIT: "Work Permit" };
  const citizenship = citizenshipMap[reply];
  if (!citizenship) {
    await sendButtonMessage(session.phone_number, "Please select your citizenship status:", [
      { id: "CIT_SA", title: "SA Citizen" },
      { id: "CIT_PR", title: "Permanent Resident" },
      { id: "CIT_PERMIT", title: "Work Permit" },
    ]);
    return;
  }
  await sendButtonMessage(session.phone_number, `📱 *Phone Number*\n\nIs this your correct WhatsApp number?\n*${session.phone_number}*`, [
    { id: "PHONE_YES", title: "Yes, that's correct" },
    { id: "PHONE_NO", title: "Use different number" },
  ]);
  await updateSession(session.phone_number, BotStep.ASK_PHONE_CONFIRM, { ...session.session_data, citizenship });
}

// ─── STEP 6: ASK_PHONE_CONFIRM ────────────────────────────────────────────

export async function handleAskPhoneConfirm(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (reply === "PHONE_NO") {
    await sendTextMessage(session.phone_number, "No problem! Please type the phone number you'd like to use (e.g. _0821234567_):");
    await updateSession(session.phone_number, BotStep.ASK_PHONE_CONFIRM, { ...session.session_data, phone_number: undefined });
    return;
  }
  let phone = session.phone_number;
  if (reply !== "PHONE_YES") {
    const cleaned = getMessageLabel(msg).replace(/\s/g, "");
    if (!/^\+?\d{9,15}$/.test(cleaned)) {
      await sendTextMessage(session.phone_number, "That doesn't look like a valid phone number. Please try again:");
      return;
    }
    phone = cleaned.startsWith("+") ? cleaned : `+27${cleaned.replace(/^0/, "")}`;
  }
  await sendTextMessage(session.phone_number, `✉️ *Email Address (optional)*\n\nPlease enter your email address, or reply *skip* if you don't have one.`);
  await updateSession(session.phone_number, BotStep.ASK_EMAIL, { ...session.session_data, phone_number: phone });
}

// ─── STEP 7: ASK_EMAIL ────────────────────────────────────────────────────

export async function handleAskEmail(session: BotSession, msg: WhatsAppMessage) {
  const input = getMessageLabel(msg).trim().toLowerCase();
  const email = input === "skip" || input === "" ? undefined : input;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    await sendTextMessage(session.phone_number, "That doesn't look like a valid email address. Please re-enter it, or reply *skip*:");
    return;
  }
  const provinces = await getProvinces();
  await safeListMessage(session.phone_number, `📍 *Province*\n\nWhich province are you in?`, "Select province",
    "South African Provinces", provinces.map((p) => ({ id: `PROV_${p.id}`, title: p.name })), "ASK_EMAIL"
  );
  await updateSession(session.phone_number, BotStep.ASK_PROVINCE, { ...session.session_data, email });
}

// ─── STEP 8: ASK_PROVINCE ─────────────────────────────────────────────────

export async function handleAskProvince(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (!reply.startsWith("PROV_")) {
    const provinces = await getProvinces();
    await safeListMessage(session.phone_number, "Please select your province from the list:", "Select province",
      "South African Provinces", provinces.map((p) => ({ id: `PROV_${p.id}`, title: p.name })), "ASK_PROVINCE_reprompt"
    );
    return;
  }
  const provinceId = parseInt(reply.replace("PROV_", ""), 10);
  const provinceName = getMessageLabel(msg);
  const citiesByProvince: Record<string, string[]> = {
    Gauteng: ["Johannesburg", "Pretoria", "Soweto", "Ekurhuleni", "Centurion", "Sandton", "Midrand", "Roodepoort"],
    "Western Cape": ["Cape Town", "Stellenbosch", "George", "Paarl", "Worcester", "Knysna", "Mossel Bay", "Hermanus"],
    "KwaZulu-Natal": ["Durban", "Pietermaritzburg", "Richards Bay", "Newcastle", "Empangeni", "Umhlanga", "Ballito", "Port Shepstone"],
    "Eastern Cape": ["Port Elizabeth", "East London", "Mthatha", "Queenstown", "King William's Town", "Grahamstown", "Uitenhage", "Bhisho"],
    Limpopo: ["Polokwane", "Tzaneen", "Phalaborwa", "Louis Trichardt", "Mokopane", "Bela-Bela", "Thabazimbi", "Giyani"],
    Mpumalanga: ["Nelspruit", "Witbank", "Middelburg", "Secunda", "Standerton", "Barberton", "White River", "Hazyview"],
    "Free State": ["Bloemfontein", "Welkom", "Bethlehem", "Sasolburg", "Kroonstad", "Phuthaditjhaba", "Virginia", "Parys"],
    "North West": ["Rustenburg", "Mahikeng", "Klerksdorp", "Potchefstroom", "Brits", "Lichtenburg", "Vryburg", "Wolmaransstad"],
    "Northern Cape": ["Kimberley", "Upington", "Springbok", "De Aar", "Kuruman", "Kathu", "Calvinia", "Colesberg"],
  };
  const cities = citiesByProvince[provinceName] ?? ["Other"];
  await safeListMessage(session.phone_number, `📍 *${provinceName}*\n\nWhich city or town are you based in?`, "Select city",
    "Cities & Towns", cities.map((city, i) => ({ id: `CITY_${i}_${city}`, title: city })), "ASK_PROVINCE"
  );
  await updateSession(session.phone_number, BotStep.ASK_CITY, { ...session.session_data, province_id: provinceId, province_name: provinceName });
}

// ─── STEP 9: ASK_CITY ─────────────────────────────────────────────────────

export async function handleAskCity(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  const city = reply.startsWith("CITY_") ? getMessageLabel(msg) : getMessageLabel(msg).trim();
  if (!city || city.length < 2) {
    await sendTextMessage(session.phone_number, "Please select your city from the list.");
    return;
  }
  await sendTextMessage(session.phone_number, `🏠 *Street Address (optional)*\n\nPlease enter your street address, or reply *skip*.\nExample: _12 Main Street, Soweto_`);
  await updateSession(session.phone_number, BotStep.ASK_ADDRESS, { ...session.session_data, city });
}

// ─── STEP 9b: ASK_ADDRESS ─────────────────────────────────────────────────

export async function handleAskAddress(session: BotSession, msg: WhatsAppMessage) {
  const input = getMessageLabel(msg).trim();
  const address = input.toLowerCase() === "skip" || input === "" ? undefined : input;
  const industries = await getIndustries();
  if (!industries || industries.length === 0) {
    console.error("[FLOW] No industries found in DB");
    await sendTextMessage(session.phone_number, "⚠️ We're having trouble loading the industry list. Please try again in a moment.");
    return;
  }
  await safeListMessage(
    session.phone_number,
    `💼 *Industry*\n\nWhich industry do you work in?\n\n_Showing first 10 — type your industry if not listed._`,
    "Select industry", "Industries",
    industries.map((ind) => ({ id: `IND_${ind.id}`, title: ind.name })),
    "ASK_ADDRESS"
  );
  await updateSession(session.phone_number, BotStep.ASK_INDUSTRY, { ...session.session_data, address });
}

// ─── STEP 10: ASK_INDUSTRY ────────────────────────────────────────────────

export async function handleAskIndustry(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (!reply.startsWith("IND_")) {
    await sendTextMessage(session.phone_number, "Please select your industry from the list.");
    return;
  }
  const industryId = parseInt(reply.replace("IND_", ""), 10);
  const industryName = getMessageLabel(msg);
  const updatedData = { ...session.session_data, industry_id: industryId, industry_name: industryName };
  const subIndustries = await getSubIndustries(industryId);
  if (subIndustries.length > 0) {
    await safeListMessage(
      session.phone_number,
      `💼 Which area of *${industryName}* do you specialise in?`,
      "Select area", industryName,
      subIndustries.map((sub) => ({ id: `SUB_${sub.id}`, title: sub.name })),
      "ASK_INDUSTRY_sub"
    );
    await updateSession(session.phone_number, BotStep.ASK_SUB_INDUSTRY, updatedData);
  } else {
    await updateSession(session.phone_number, BotStep.ASK_JOB_TITLE, updatedData);
    await showJobTitles(session.phone_number);
  }
}

// ─── STEP 11: ASK_SUB_INDUSTRY ────────────────────────────────────────────

export async function handleAskSubIndustry(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (!reply.startsWith("SUB_")) {
    await sendTextMessage(session.phone_number, "Please select your specialisation from the list.");
    return;
  }
  const subIndustryId = parseInt(reply.replace("SUB_", ""), 10);
  const subIndustryName = getMessageLabel(msg);
  await updateSession(session.phone_number, BotStep.ASK_JOB_TITLE, { ...session.session_data, sub_industry_id: subIndustryId, sub_industry_name: subIndustryName });
  await showJobTitles(session.phone_number);
}

async function showJobTitles(phoneNumber: string) {
  const jobTitles = await getJobTitles();
  if (jobTitles.length === 0) {
    await sendTextMessage(phoneNumber, `🧑‍💼 *Job Title*\n\nPlease type your job title or the role you are looking for:`);
    return;
  }
  await safeListMessage(
    phoneNumber,
    `🧑‍💼 *Job Title*\n\nSelect your job title.\n\n_Showing first 10 — tap Done after selecting._`,
    "Select job title", "Job Titles",
    jobTitles.map((jt) => ({ id: `JT_${jt.id}`, title: jt.name })),
    "showJobTitles"
  );
}

// ─── STEP 12: ASK_JOB_TITLE ───────────────────────────────────────────────

export async function handleAskJobTitle(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (!reply.startsWith("JT_")) {
    await sendTextMessage(session.phone_number, "Please select your job title from the list.");
    return;
  }
  const jobTitleId = parseInt(reply.replace("JT_", ""), 10);
  const jobTitleName = getMessageLabel(msg);
  const existingIds = session.session_data.job_title_ids ?? [];
  const existingNames = session.session_data.job_title_names ?? [];
  const updatedIds = existingIds.includes(jobTitleId) ? existingIds : [...existingIds, jobTitleId];
  const updatedNames = existingIds.includes(jobTitleId) ? existingNames : [...existingNames, jobTitleName];
  await sendButtonMessage(session.phone_number, `Selected: *${updatedNames.join(", ")}*\n\nWould you like to add another job title?`, [
    { id: "JT_ADD_MORE", title: "Add another title" },
    { id: "JT_DONE", title: "Done" },
  ]);
  await updateSession(session.phone_number, BotStep.ASK_JOB_TITLE, { ...session.session_data, job_title_ids: updatedIds, job_title_names: updatedNames });
}

export async function handleJobTitleDone(session: BotSession) {
  const industryId = session.session_data.industry_id;
  if (!industryId) { await proceedToExperience(session); return; }
  const skills = await getSkillsByIndustry(industryId);
  if (skills.length === 0) { await proceedToExperience(session); return; }
  await safeListMessage(
    session.phone_number,
    `🔧 *Skills*\n\nSelect a key skill for your industry.\n\n_Showing first 10._`,
    "Select skill", "Skills",
    skills.map((s) => ({ id: `SKILL_${s.id}`, title: s.name })),
    "handleJobTitleDone"
  );
  await updateSession(session.phone_number, BotStep.ASK_SKILLS, session.session_data);
}

// ─── STEP 13: ASK_SKILLS ──────────────────────────────────────────────────

export async function handleAskSkills(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (reply === "SKILLS_DONE") { await proceedToExperience(session); return; }
  if (!reply.startsWith("SKILL_")) {
    await sendTextMessage(session.phone_number, "Please select a skill from the list, or tap *Done* when finished.");
    return;
  }
  const skillId = parseInt(reply.replace("SKILL_", ""), 10);
  const skillName = getMessageLabel(msg);
  const existingIds = session.session_data.skill_ids ?? [];
  const existingNames = session.session_data.skill_names ?? [];
  const updatedIds = existingIds.includes(skillId) ? existingIds : [...existingIds, skillId];
  const updatedNames = existingIds.includes(skillId) ? existingNames : [...existingNames, skillName];
  await sendButtonMessage(session.phone_number, `Selected: *${updatedNames.join(", ")}*\n\nAdd another skill or tap Done.`, [
    { id: "SKILLS_ADD_MORE", title: "Add another skill" },
    { id: "SKILLS_DONE", title: "Done" },
  ]);
  await updateSession(session.phone_number, BotStep.ASK_SKILLS, { ...session.session_data, skill_ids: updatedIds, skill_names: updatedNames });
}

async function proceedToExperience(session: BotSession) {
  await sendButtonMessage(session.phone_number, `⏳ *Experience*\n\nHow many years of work experience do you have?`, [
    { id: "EXP_0", title: "Less than 1 year" },
    { id: "EXP_1", title: "1–3 years" },
    { id: "EXP_3", title: "3–5 years" },
  ]);
  await sendButtonMessage(session.phone_number, "Or select:", [{ id: "EXP_5", title: "5+ years" }]);
  await updateSession(session.phone_number, BotStep.ASK_EXPERIENCE, session.session_data);
}

// ─── STEP 14: ASK_EXPERIENCE ──────────────────────────────────────────────

export async function handleAskExperience(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  const expMap: Record<string, number> = { EXP_0: 0, EXP_1: 1, EXP_3: 3, EXP_5: 5 };
  if (!Object.prototype.hasOwnProperty.call(expMap, reply)) {
    await sendButtonMessage(session.phone_number, "Please select your years of experience:", [
      { id: "EXP_0", title: "Less than 1 year" },
      { id: "EXP_1", title: "1–3 years" },
      { id: "EXP_3", title: "3–5 years" },
    ]);
    return;
  }
  await safeListMessage(session.phone_number, `🎓 *Education Level*\n\nWhat is your highest level of education?`, "Select education",
    "Education Levels", [
      { id: "EDU_MATRIC", title: "Matric / Grade 12" },
      { id: "EDU_DIPLOMA", title: "Diploma" },
      { id: "EDU_DEGREE", title: "Degree" },
      { id: "EDU_TRADE", title: "Trade / Artisan Certificate" },
      { id: "EDU_POSTGRAD", title: "Postgraduate" },
      { id: "EDU_NONE", title: "No formal qualification" },
    ], "ASK_EXPERIENCE"
  );
  await updateSession(session.phone_number, BotStep.ASK_EDUCATION, { ...session.session_data, years_experience: expMap[reply] });
}

// ─── STEP 15: ASK_EDUCATION ───────────────────────────────────────────────

export async function handleAskEducation(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  const eduMap: Record<string, string> = {
    EDU_MATRIC: "Matric / Grade 12", EDU_DIPLOMA: "Diploma", EDU_DEGREE: "Degree",
    EDU_TRADE: "Trade / Artisan Certificate", EDU_POSTGRAD: "Postgraduate", EDU_NONE: "No formal qualification",
  };
  const education_level = eduMap[reply];
  if (!education_level) {
    await sendTextMessage(session.phone_number, "Please select your education level from the list.");
    return;
  }
  await sendButtonMessage(session.phone_number, `💼 *Employment Status*\n\nAre you currently employed?`, [
    { id: "EMP_YES", title: "Yes, currently employed" },
    { id: "EMP_NO", title: "No, available now" },
  ]);
  await updateSession(session.phone_number, BotStep.ASK_AVAILABILITY, { ...session.session_data, education_level });
}

// ─── STEP 16: ASK_AVAILABILITY ────────────────────────────────────────────

export async function handleAskAvailability(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (reply === "EMP_YES") {
    await safeListMessage(session.phone_number, `📅 *Notice Period*\n\nHow much notice do you need to give your current employer?`, "Select notice period",
      "Notice Period", [
        { id: "AVAIL_IMMEDIATE", title: "Immediately" }, { id: "AVAIL_1WEEK", title: "1 week" },
        { id: "AVAIL_2WEEKS", title: "2 weeks" }, { id: "AVAIL_1MONTH", title: "1 month" },
        { id: "AVAIL_OTHER", title: "Longer than 1 month" },
      ], "ASK_AVAILABILITY_employed"
    );
    await updateSession(session.phone_number, BotStep.ASK_AVAILABILITY, { ...session.session_data, employment_status: "Employed" });
    return;
  }
  if (reply === "EMP_NO") {
    await safeListMessage(session.phone_number, `📅 *Start Date*\n\nWhen can you start working?`, "Select start date",
      "Availability", [
        { id: "AVAIL_IMMEDIATE", title: "Immediately" }, { id: "AVAIL_1WEEK", title: "Within 1 week" },
        { id: "AVAIL_2WEEKS", title: "Within 2 weeks" }, { id: "AVAIL_1MONTH", title: "Within 1 month" },
        { id: "AVAIL_OTHER", title: "Longer than 1 month" },
      ], "ASK_AVAILABILITY_unemployed"
    );
    await updateSession(session.phone_number, BotStep.ASK_AVAILABILITY, { ...session.session_data, employment_status: "Unemployed" });
    return;
  }
  const availMap: Record<string, string> = {
    AVAIL_IMMEDIATE: "Immediately", AVAIL_1WEEK: "1 week", AVAIL_2WEEKS: "2 weeks",
    AVAIL_1MONTH: "1 month", AVAIL_OTHER: "Longer than 1 month",
  };
  const availability = availMap[reply];
  if (!availability) {
    await sendButtonMessage(session.phone_number, "Are you currently employed?", [
      { id: "EMP_YES", title: "Yes, currently employed" }, { id: "EMP_NO", title: "No, available now" },
    ]);
    return;
  }
  await safeListMessage(session.phone_number, `💰 *Expected Salary*\n\nWhat is your expected monthly salary?`, "Select range",
    "Monthly Salary (ZAR)", [
      { id: "SAL_5", title: "R5,000 – R10,000" }, { id: "SAL_10", title: "R10,000 – R15,000" },
      { id: "SAL_15", title: "R15,000 – R25,000" }, { id: "SAL_25", title: "R25,000 – R40,000" },
      { id: "SAL_40", title: "R40,000 – R60,000" }, { id: "SAL_60", title: "R60,000+" },
      { id: "SAL_NEG", title: "Negotiable" },
    ], "ASK_AVAILABILITY_salary"
  );
  await updateSession(session.phone_number, BotStep.ASK_SALARY, { ...session.session_data, availability });
}

// ─── STEP 17: ASK_SALARY ──────────────────────────────────────────────────

export async function handleAskSalary(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  const salaryMap: Record<string, number> = { SAL_5: 7500, SAL_10: 12500, SAL_15: 20000, SAL_25: 32500, SAL_40: 50000, SAL_60: 60000, SAL_NEG: 0 };
  if (!Object.prototype.hasOwnProperty.call(salaryMap, reply)) {
    await sendTextMessage(session.phone_number, "Please select your expected salary range from the list.");
    return;
  }
  const jobTypes = await getJobTypes();
  if (jobTypes.length === 0) {
    await sendButtonMessage(session.phone_number, `🗂️ *Work Type*\n\nWhat type of work are you looking for?`, [
      { id: "JT_TYPE_1", title: "Full-time" },
      { id: "JT_TYPE_2", title: "Part-time" },
      { id: "JT_TYPE_3", title: "Contract" },
    ]);
    await updateSession(session.phone_number, BotStep.ASK_WORK_TYPE, { ...session.session_data, expected_salary: salaryMap[reply] });
    return;
  }
  await safeListMessage(session.phone_number, `🗂️ *Work Type*\n\nWhat type of work are you looking for?`, "Select work type",
    "Work Types", jobTypes.map((jt) => ({ id: `JT_TYPE_${jt.id}`, title: jt.name })), "ASK_SALARY"
  );
  await updateSession(session.phone_number, BotStep.ASK_WORK_TYPE, { ...session.session_data, expected_salary: salaryMap[reply] });
}

// ─── STEP 18: ASK_WORK_TYPE ───────────────────────────────────────────────

export async function handleAskWorkType(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (!reply.startsWith("JT_TYPE_")) {
    await sendTextMessage(session.phone_number, "Please select a work type from the list.");
    return;
  }
  const workTypeId = parseInt(reply.replace("JT_TYPE_", ""), 10);
  const workTypeName = getMessageLabel(msg);
  await sendButtonMessage(session.phone_number, `🗺️ *Relocation*\n\nAre you willing to relocate for work?`, [
    { id: "RELOCATE_YES", title: "Yes, willing to relocate" },
    { id: "RELOCATE_NO", title: "No, staying local" },
  ]);
  await updateSession(session.phone_number, BotStep.ASK_RELOCATE, { ...session.session_data, work_type_id: workTypeId, work_type_name: workTypeName });
}

// ─── STEP 19: ASK_RELOCATE ────────────────────────────────────────────────

export async function handleAskRelocate(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (reply !== "RELOCATE_YES" && reply !== "RELOCATE_NO") {
    await sendButtonMessage(session.phone_number, "Are you willing to relocate for work?", [
      { id: "RELOCATE_YES", title: "Yes, willing to relocate" }, { id: "RELOCATE_NO", title: "No, staying local" },
    ]);
    return;
  }
  await sendButtonMessage(session.phone_number, `🚗 *Driver's Licence*\n\nDo you have a valid driver's licence?`, [
    { id: "DL_YES", title: "Yes" }, { id: "DL_NO", title: "No" },
  ]);
  await updateSession(session.phone_number, BotStep.ASK_DRIVERS_LICENSE, { ...session.session_data, willing_to_relocate: reply === "RELOCATE_YES" });
}

// ─── STEP 20: ASK_DRIVERS_LICENSE ─────────────────────────────────────────

export async function handleAskDriversLicense(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (reply === "DL_NO") { await proceedToCvUpload(session, { ...session.session_data, drivers_license: false }); return; }
  if (reply === "DL_YES") {
    const codes = await getDriversLicenseCodes();
    await safeListMessage(session.phone_number, "Please select your driver's licence code:", "Select code",
      "Licence Codes", codes.map((c) => ({ id: `DLC_${c.id}`, title: c.name })), "ASK_DRIVERS_LICENSE"
    );
    await updateSession(session.phone_number, BotStep.ASK_DRIVERS_LICENSE_CODE, { ...session.session_data, drivers_license: true });
    return;
  }
  await sendButtonMessage(session.phone_number, "Please select one:", [{ id: "DL_YES", title: "Yes" }, { id: "DL_NO", title: "No" }]);
}

// ─── STEP 20b: ASK_DRIVERS_LICENSE_CODE ───────────────────────────────────

export async function handleAskDriversLicenseCode(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (!reply.startsWith("DLC_")) { await sendTextMessage(session.phone_number, "Please select a licence code from the list."); return; }
  const codeId = parseInt(reply.replace("DLC_", ""), 10);
  const codeName = getMessageLabel(msg);
  await proceedToCvUpload(session, { ...session.session_data, drivers_license_code_id: codeId, drivers_license_code: codeName });
}

async function proceedToCvUpload(session: BotSession, data: SessionData) {
  await sendButtonMessage(session.phone_number, `📁 *CV Upload*\n\nWould you like to upload your CV?\n(PDF or image)`, [
    { id: "CV_UPLOAD", title: "Upload CV" }, { id: "CV_SKIP", title: "Skip for now" },
  ]);
  await updateSession(session.phone_number, BotStep.ASK_CV_UPLOAD, data);
}

// ─── STEP 21: ASK_CV_UPLOAD ───────────────────────────────────────────────

export async function handleAskCvUpload(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (reply === "CV_SKIP") { await proceedToCriminalRecord(session); return; }
  if (msg.type === "document" || msg.type === "image") {
    const mediaId = msg.document?.id ?? msg.image?.id ?? "";
    const filename = msg.document?.filename ?? `cv_${Date.now()}.jpg`;
    try {
      console.log("[CV] Received, mediaId:", mediaId, "filename:", filename);
      void downloadMediaBuffer(mediaId);
      await updateSession(session.phone_number, BotStep.ASK_CRIMINAL_RECORD, { ...session.session_data, cv_document_id: "mock-cv-id" });
      await sendTextMessage(session.phone_number, `✅ CV received!`);
      await proceedToCriminalRecord(session);
    } catch {
      await sendTextMessage(session.phone_number, "Sorry, we couldn't process your CV. Please try again or tap *Skip*.");
      await sendButtonMessage(session.phone_number, "Would you like to skip?", [{ id: "CV_SKIP", title: "Skip for now" }]);
    }
    return;
  }
  if (reply === "CV_UPLOAD") { await sendTextMessage(session.phone_number, "Please send your CV as a *PDF* or *image* file now. 📎"); return; }
  await proceedToCriminalRecord(session);
}

async function proceedToCriminalRecord(session: BotSession) {
  await sendButtonMessage(session.phone_number, `🔍 *Criminal Record (optional)*\n\nDo you have a criminal record?`, [
    { id: "CR_YES", title: "Yes" }, { id: "CR_NO", title: "No / Skip" },
  ]);
  await updateSession(session.phone_number, BotStep.ASK_CRIMINAL_RECORD, session.session_data);
}

// ─── STEP 22: ASK_CRIMINAL_RECORD ─────────────────────────────────────────

export async function handleAskCriminalRecord(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (reply === "CR_NO") { await proceedToDismissal(session, { ...session.session_data, criminal_record: false }); return; }
  if (reply === "CR_YES") {
    const offences = await getCriminalOffences();
    await safeListMessage(session.phone_number, "Please select the type of offence:", "Select offence",
      "Offence Types", offences.map((o) => ({ id: `OFF_${o.id}`, title: o.name })), "ASK_CRIMINAL_RECORD"
    );
    await updateSession(session.phone_number, BotStep.ASK_CRIMINAL_OFFENCE, { ...session.session_data, criminal_record: true });
    return;
  }
  await sendButtonMessage(session.phone_number, "Please select one:", [{ id: "CR_YES", title: "Yes" }, { id: "CR_NO", title: "No / Skip" }]);
}

// ─── STEP 22b: ASK_CRIMINAL_OFFENCE ───────────────────────────────────────

export async function handleAskCriminalOffence(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (!reply.startsWith("OFF_")) { await sendTextMessage(session.phone_number, "Please select an offence from the list."); return; }
  const offenceId = parseInt(reply.replace("OFF_", ""), 10);
  const offenceName = getMessageLabel(msg);
  await proceedToDismissal(session, { ...session.session_data, criminal_offence_id: offenceId, criminal_offence: offenceName });
}

async function proceedToDismissal(session: BotSession, data: SessionData) {
  await sendButtonMessage(session.phone_number, `⚠️ *Previous Dismissal (optional)*\n\nHave you ever been dismissed from a previous job?`, [
    { id: "DISMISS_YES", title: "Yes" }, { id: "DISMISS_NO", title: "No / Skip" },
  ]);
  await updateSession(session.phone_number, BotStep.ASK_DISMISSAL, data);
}

// ─── STEP 23: ASK_DISMISSAL ───────────────────────────────────────────────

export async function handleAskDismissal(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (reply === "DISMISS_NO") { await sendReviewSummary(session, { ...session.session_data, dismissed_previously: false }); return; }
  if (reply === "DISMISS_YES") {
    await sendTextMessage(session.phone_number, `Please briefly explain the reason (optional — type *skip* to continue):`);
    await updateSession(session.phone_number, BotStep.ASK_DISMISSAL, { ...session.session_data, dismissed_previously: true });
    return;
  }
  const input = getMessageLabel(msg).trim();
  const dismissal_reason = input.toLowerCase() === "skip" || input === "" ? undefined : input;
  await sendReviewSummary(session, { ...session.session_data, dismissal_reason });
}

// ─── STEP 24: REVIEW SUMMARY ──────────────────────────────────────────────

async function sendReviewSummary(session: BotSession, data: SessionData) {
  const expLabel = data.years_experience === 0 ? "Less than 1 year" : `${data.years_experience}+ years`;
  const lines = [
    `📋 *Registration Summary*\n`,
    `👤 *Name:* ${data.name}`,
    `📅 *Date of Birth:* ${data.date_of_birth ?? "Not provided"}`,
    `⚧ *Gender:* ${data.gender ?? "Not provided"}`,
    data.citizenship ? `🌍 *Citizenship:* ${data.citizenship}` : null,
    `📱 *Phone:* ${data.phone_number ?? session.phone_number}`,
    `✉️ *Email:* ${data.email ?? "Not provided"}`,
    `📍 *Province:* ${data.province_name}`,
    `🏙️ *City:* ${data.city}`,
    data.address ? `🏠 *Address:* ${data.address}` : null,
    `🏭 *Industry:* ${data.industry_name}`,
    data.sub_industry_name ? `🔧 *Specialisation:* ${data.sub_industry_name}` : null,
    `💼 *Job Title(s):* ${data.job_title_names?.join(", ") ?? "Not provided"}`,
    data.skill_names?.length ? `🛠️ *Skills:* ${data.skill_names.join(", ")}` : null,
    `⏳ *Experience:* ${expLabel}`,
    `🎓 *Education:* ${data.education_level ?? "Not provided"}`,
    `💼 *Employment:* ${data.employment_status ?? "Not specified"}`,
    `📅 *Availability:* ${data.availability ?? "Not provided"}`,
    data.expected_salary ? `💰 *Expected Salary:* R${data.expected_salary.toLocaleString()}/month` : `💰 *Expected Salary:* Negotiable`,
    `🗂️ *Work Type:* ${data.work_type_name ?? "Not specified"}`,
    `🗺️ *Willing to Relocate:* ${data.willing_to_relocate ? "Yes" : "No"}`,
    `🚗 *Driver's Licence:* ${data.drivers_license ? `Yes (${data.drivers_license_code})` : "No"}`,
    `📁 *CV:* ${data.cv_document_id ? "Uploaded ✅" : "Not uploaded"}`,
    `🔍 *Criminal Record:* ${data.criminal_record ? `Yes (${data.criminal_offence})` : "No"}`,
    data.dismissed_previously ? `⚠️ *Previous Dismissal:* Yes${data.dismissal_reason ? ` — ${data.dismissal_reason}` : ""}` : null,
  ].filter(Boolean).join("\n");
  await sendTextMessage(session.phone_number, lines);
  await sendButtonMessage(session.phone_number, "Is all of the above information correct?", [
    { id: "CONFIRM_YES", title: "Confirm ✅" }, { id: "CONFIRM_EDIT", title: "Edit" },
  ]);
  await updateSession(session.phone_number, BotStep.REVIEW, data);
}

// ─── STEP 24: REVIEW ──────────────────────────────────────────────────────

export async function handleReview(session: BotSession, msg: WhatsAppMessage) {
  const reply = getMessageText(msg);
  if (reply === "CONFIRM_EDIT") {
    await sendTextMessage(session.phone_number, "No problem! Let's start over. Type *Hi* to restart.");
    await updateSession(session.phone_number, BotStep.START, {});
    return;
  }
  if (reply !== "CONFIRM_YES") {
    await sendButtonMessage(session.phone_number, "Please confirm your registration:", [
      { id: "CONFIRM_YES", title: "Confirm ✅" }, { id: "CONFIRM_EDIT", title: "Edit" },
    ]);
    return;
  }
  try {
    await sendTextMessage(session.phone_number, "⏳ Saving your profile, please wait...");
    const candidateId = await saveCandidateFromSession(session.session_data.phone_number ?? session.phone_number, session.session_data);
    await updateSession(session.phone_number, BotStep.COMPLETE, session.session_data, candidateId);
    await sendTextMessage(session.phone_number, `🎉 *You're in the JustWork network!*\n\nYour profile has been created. When a recruiter posts a job that matches your qualifications, we'll send it straight to you on WhatsApp.\n\nNo need to apply anywhere — the work comes to you! 💪\n\nGood luck, ${session.session_data.name?.split(" ")[0]}! 🚀`);
  } catch (err) {
    console.error("[Bot] Failed to save candidate:", err);
    await sendTextMessage(session.phone_number, "❌ There was an error saving your profile. Please try again by sending *Hi*.");
    await updateSession(session.phone_number, BotStep.START, {});
  }
}