import crypto from "crypto";
import { supabaseAdmin } from "./supabase.service";

const OTP_EXPIRY_MINUTES = 10;

export const generateOTP = (): string => {
  // 6-digit numeric OTP
  return crypto.randomInt(100000, 999999).toString();
};

export const saveOTP = async (phoneNumber: string, otp: string): Promise<void> => {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store OTP in bot_sessions session_data
  const { error } = await supabaseAdmin
    .from("bot_sessions")
    .upsert(
      {
        phone_number: phoneNumber,
        current_step: "OTP_SENT",
        session_data: {
          otp,
          otp_expires_at: expiresAt.toISOString(),
          otp_attempts: 0,
        },
        last_active_at: new Date().toISOString(),
      },
      { onConflict: "phone_number" }
    );

  if (error) throw error;
};

export const verifyOTP = async (
  phoneNumber: string,
  submittedOtp: string
): Promise<{ valid: boolean; reason?: string }> => {
  const { data: session, error } = await supabaseAdmin
    .from("bot_sessions")
    .select("session_data")
    .eq("phone_number", phoneNumber)
    .single();

  if (error || !session) return { valid: false, reason: "Session not found" };

  const { otp, otp_expires_at, otp_attempts } = session.session_data;

  // Check max attempts (3)
  if (otp_attempts >= 3) {
    return { valid: false, reason: "Too many attempts" };
  }

  // Increment attempt count
  await supabaseAdmin
    .from("bot_sessions")
    .update({
      session_data: {
        ...session.session_data,
        otp_attempts: otp_attempts + 1,
      },
    })
    .eq("phone_number", phoneNumber);

  // Check expiry
  if (new Date() > new Date(otp_expires_at)) {
    return { valid: false, reason: "OTP expired" };
  }

  // Check OTP match
  if (submittedOtp !== otp) {
    return { valid: false, reason: "Invalid OTP" };
  }

  return { valid: true };
};