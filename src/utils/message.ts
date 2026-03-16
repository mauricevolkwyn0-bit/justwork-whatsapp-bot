import { WhatsAppMessage } from "../types/bot";

export function getMessageText(msg: WhatsAppMessage): string {
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

export function getMessageLabel(msg: WhatsAppMessage): string {
  if (msg.type === "interactive") {
    return (
      msg.interactive?.button_reply?.title ??
      msg.interactive?.list_reply?.title ??
      ""
    );
  }
  return msg.text?.body?.trim() ?? "";
}