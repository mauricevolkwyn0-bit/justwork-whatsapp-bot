import { Request, Response } from "express";
import { WhatsAppWebhookBody, WhatsAppMessage } from "../types/bot";
import { getOrCreateSession } from "../services/session.service";
import { routeMessage } from "../routes/bot.router";
import { supabase } from "../services/supabase.service";

// ─── Webhook verification (GET) ───────────────────────────────────────────

export const verifyWebhook = (req: Request, res: Response): void => {
  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[Webhook] Verification successful");
    res.status(200).send(challenge);
    return;
  }
  res.sendStatus(403);
};

// ─── Incoming message handler (POST) ─────────────────────────────────────

export const receiveWebhook = async (req: Request, res: Response): Promise<void> => {
  // Always respond 200 immediately so WhatsApp doesn't retry
  res.sendStatus(200);

  const body = req.body as WhatsAppWebhookBody;
  if (body.object !== "whatsapp_business_account") return;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages;
      if (!messages?.length) continue;

      for (const msg of messages) {
        await processMessage(msg);
      }
    }
  }
};

// ─── Core message processor ───────────────────────────────────────────────

async function processMessage(msg: WhatsAppMessage): Promise<void> {
  const phoneNumber = msg.from;
  if (!phoneNumber) return;

  try {
    // Log to whatsapp_message_logs
    await supabase.from("whatsapp_message_logs").insert({
      phone_number: phoneNumber,
      direction: "INBOUND",
      message_type: msg.type,
      message_body:
        msg.type === "text"
          ? msg.text?.body
          : JSON.stringify(msg.interactive ?? msg.document ?? msg.image),
    });

    const session = await getOrCreateSession(phoneNumber);
    await routeMessage(session, msg);
  } catch (err) {
    console.error(`[Webhook] Error processing message from ${phoneNumber}:`, err);
  }
}