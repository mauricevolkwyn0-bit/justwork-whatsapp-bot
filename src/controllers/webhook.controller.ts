import { Request, Response } from "express";
import { WhatsAppWebhookBody, WhatsAppMessage } from "../types/bot";
import { getOrCreateSession } from "../services/session.service";
import { routeMessage } from "../routes/bot.router";
import { supabase } from "../services/supabase.service";

// ─── Webhook verification (GET) ───────────────────────────────────────────

export const verifyWebhook = (req: Request, res: Response): void => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("[Webhook] Verify attempt — mode:", mode, "token match:", token === VERIFY_TOKEN);

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

  console.log("[Webhook] Body received:", JSON.stringify(req.body, null, 2));

  const body = req.body as WhatsAppWebhookBody;

  if (body.object !== "whatsapp_business_account") {
    console.log("[Webhook] Skipping — object is:", body.object);
    return;
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const messages = change.value?.messages;
      if (!messages?.length) {
        console.log("[Webhook] No messages in change, skipping");
        continue;
      }

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

  console.log(`[Bot] Processing message from ${phoneNumber} — type: ${msg.type}`);

  try {
    console.log("[Bot] Inserting message log...");
    await supabase.from("whatsapp_message_logs").insert({
      phone_number: phoneNumber,
      direction: "INBOUND",
      message_type: msg.type,
      message_body:
        msg.type === "text"
          ? msg.text?.body
          : JSON.stringify(msg.interactive ?? msg.document ?? msg.image),
    });

    console.log("[Bot] Getting session...");
    const session = await getOrCreateSession(phoneNumber);
    console.log(`[Bot] Session step: ${session.current_step}`);

    console.log("[Bot] Routing message...");
    await routeMessage(session, msg);
    console.log("[Bot] Done.");
  } catch (err) {
    console.error(`[Webhook] Error processing message from ${phoneNumber}:`, err);
  }
}