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

export async function sendInteractiveWithImageHeader(
  to: string,
  imageUrl: string,
  body: string,
  buttons: Array<{ id: string; title: string }>
): Promise<void> {
  console.log("[WhatsApp] sendInteractiveWithImageHeader to:", to);
  await postToWhatsApp({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      header: {
        type: "image",
        image: { link: imageUrl },
      },
      body: { text: body },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

async function postToWhatsApp(payload: object): Promise<void> {
  const res = await fetch(getUrl(), {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  const text = await res.text();

  try {
    const data = JSON.parse(text);

    if (!res.ok) {
      console.error("[WhatsApp] API error:", data);
    } else {
      console.log("[WhatsApp] API success:", data);
    }
  } catch {
    console.error("[WhatsApp] Unexpected response:", text);
  }
}

// ─── OTP (existing) ────────────────────────────────────────────────────────

export const sendWhatsAppOTP = async (
  phoneNumber: string,
  otp: string
): Promise<void> => {
  const message = `👋 Welcome to JustWork!\n\nYour verification code is:\n\n*${otp}*\n\nThis code expires in 10 minutes. Do not share it with anyone.`;
  await sendTextMessage(phoneNumber, message);
};

// ─── Text ─────────────────────────────────────────────────────────────────

export const sendWhatsAppMessage = async (
  phoneNumber: string,
  message: string
): Promise<void> => {
  await sendTextMessage(phoneNumber, message);
};

export async function sendTextMessage(to: string, body: string): Promise<void> {
  console.log("[WhatsApp] sendTextMessage to:", to);
  await postToWhatsApp({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

// ─── Image ─────────────────────────────────────────────────────────────────

export async function sendImageMessage(
  to: string,
  imageUrl: string,
  caption: string
): Promise<void> {
  console.log("[WhatsApp] sendImageMessage to:", to);
  await postToWhatsApp({
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: { link: imageUrl, caption },
  });
}

// ─── Button (interactive) ──────────────────────────────────────────────────

export async function sendButtonMessage(
  to: string,
  body: string,
  buttons: Array<{ id: string; title: string }>
): Promise<void> {
  console.log("[WhatsApp] sendButtonMessage to:", to);
  await postToWhatsApp({
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
  });
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
  console.log("[WhatsApp] sendListMessage to:", to);
  await postToWhatsApp({
    messaging_product: "whatsapp",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: body },
      action: { button: buttonLabel, sections },
    },
  });
}

// ─── Media download (for CV uploads) ──────────────────────────────────────

export async function downloadMediaBuffer(mediaId: string): Promise<Buffer> {
  const mediaRes = await fetch(
    `https://graph.facebook.com/v18.0/${mediaId}`,
    { headers: getHeaders() }
  );
  const mediaData = await mediaRes.json() as { url: string };

  const fileRes = await fetch(mediaData.url, { headers: getHeaders() });
  const arrayBuffer = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}