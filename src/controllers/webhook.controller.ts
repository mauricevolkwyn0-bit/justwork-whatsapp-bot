import { Request, Response } from "express";
import { WHATSAPP_VERIFY_TOKEN } from "../config/env";
import { sendWhatsAppMessage } from "../services/whatsapp.service";

export const verifyWebhook = (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("✅ Webhook verified by Meta");
    res.status(200).send(challenge);
  } else {
    console.error("❌ Webhook verification failed");
    res.status(403).send("Forbidden");
  }
};

export const receiveWebhook = async (req: Request, res: Response) => {
  const body = req.body;

  // Always respond to Meta immediately
  res.status(200).send("EVENT_RECEIVED");

  if (body.object === "whatsapp_business_account") {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages;
        if (messages?.length) {
          for (const message of messages) {
            const from = message.from;
            const type = message.type;

            console.log(`📩 Message from ${from}, type: ${type}`);

            if (type === "text") {
              const text = message.text.body;
              console.log(`💬 Text: ${text}`);
              try {
                await sendWhatsAppMessage(from, `👋 Hi! Welcome to JustWork. You said: "${text}"`);
                console.log(`✅ Reply sent to ${from}`);
              } catch (err: any) {
                console.error(`❌ Failed to send reply:`, err?.response?.data || err?.message || err);
              }
            }
          }
        }
      }
    }
  }
};
