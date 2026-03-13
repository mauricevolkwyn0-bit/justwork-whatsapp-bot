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

  if (body.object === "whatsapp_business_account") {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const messages = change.value?.messages;
        if (messages?.length) {
          for (const message of messages) {
            const from = message.from;
            const type = message.type;

            console.log(`📩 Incoming message from ${from}:`, JSON.stringify(message));

            if (type === "text") {
              const text = message.text.body.toLowerCase();
              await sendWhatsAppMessage(from, `👋 Hi! Welcome to JustWork. You said: "${text}"`);
            }
          }
        }
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.status(404).send("Not Found");
  }
};
