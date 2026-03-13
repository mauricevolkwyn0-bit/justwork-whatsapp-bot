import { Request, Response } from "express";
import { WHATSAPP_VERIFY_TOKEN } from "../config/env";

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

export const receiveWebhook = (req: Request, res: Response) => {
  const body = req.body;

  if (body.object === "whatsapp_business_account") {
    body.entry?.forEach((entry: any) => {
      entry.changes?.forEach((change: any) => {
        const messages = change.value?.messages;
        if (messages?.length) {
          messages.forEach((message: any) => {
            console.log("📩 Incoming message:", JSON.stringify(message, null, 2));
            // TODO: handle incoming messages here
          });
        }
      });
    });
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.status(404).send("Not Found");
  }
};
