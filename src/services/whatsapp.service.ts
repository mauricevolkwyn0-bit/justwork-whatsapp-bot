import axios from "axios";
import {
  WHATSAPP_API_URL,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_ACCESS_TOKEN,
} from "../config/env";

// ─── Shared config ─────────────────────────────────────────────────────────

const getUrl = () => `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;
const getHeaders = () => ({
  Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
});

// ─── OTP (existing) ────────────────────────────────────────────────────────

export const sendWhatsAppOTP = async (
  phoneNumber: string,
  otp: string
): Promise<void> => {
  const message = `👋 Welcome to JustWork!\n\nYour verification code is:\n\n*${otp}*\n\nThis code expires in 10 minutes. Do not share it with anyone.`;
  await sendTextMessage(phoneNumber, message);
};

// ─── Text (existing + used by bot) ────────────────────────────────────────

export const sendWhatsAppMessage = async (
  phoneNumber: string,
  message: string
): Promise<void> => {
  await sendTextMessage(phoneNumber, message);
};

export async function sendTextMessage(to: string, body: string): Promise<void> {
  await axios.post(
    getUrl(),
    { messaging_product: "whatsapp", to, type: "text", text: { body } },
    { headers: getHeaders() }
  );
}

// ─── Image ─────────────────────────────────────────────────────────────────

export async function sendImageMessage(
  to: string,
  imageUrl: string,
  caption: string
): Promise<void> {
  await axios.post(
    getUrl(),
    {
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: { link: imageUrl, caption },
    },
    { headers: getHeaders() }
  );
}

// ─── Button (interactive) ──────────────────────────────────────────────────

export async function sendButtonMessage(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>
): Promise<void> {
  await axios.post(
    getUrl(),
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        action: {
          buttons: buttons.map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    },
    { headers: getHeaders() }
  );
}

// ─── List (interactive) ────────────────────────────────────────────────────

export async function sendListMessage(
  to: string,
  body: string,
  buttonLabel: string,
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>
): Promise<void> {
  await axios.post(
    getUrl(),
    {
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: body },
        action: { button: buttonLabel, sections },
      },
    },
    { headers: getHeaders() }
  );
}

// ─── Media download (for CV uploads) ──────────────────────────────────────

export async function downloadMediaBuffer(mediaId: string): Promise<Buffer> {
  const { data: mediaData } = await axios.get(
    `https://graph.facebook.com/v18.0/${mediaId}`,
    { headers: getHeaders() }
  );
  const { data } = await axios.get(mediaData.url, {
    headers: getHeaders(),
    responseType: "arraybuffer",
  });
  return Buffer.from(data);
}