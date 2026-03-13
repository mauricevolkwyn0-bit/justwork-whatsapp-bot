import { supabaseAdmin } from "./supabase.service";
import { generateOTP, saveOTP, verifyOTP } from "./otp.service";
import { sendWhatsAppOTP } from "./whatsapp.service";

// ─── Return Types ──────────────────────────────────────────

type AuthSuccess = { success: true; authUserId: string };
type AuthFailure = { success: false; reason: string };
type AuthResult = AuthSuccess | AuthFailure;

type SignInSuccess = { success: true; session: object };
type SignInFailure = { success: false; reason: string };
type SignInResult = SignInSuccess | SignInFailure;

// ─── CANDIDATE (WhatsApp OTP) ──────────────────────────────

export const initiateCandidateAuth = async (phoneNumber: string): Promise<void> => {
  const otp = generateOTP();
  await saveOTP(phoneNumber, otp);
  await sendWhatsAppOTP(phoneNumber, otp);
};

export const completeCandidateAuth = async (
  phoneNumber: string,
  submittedOtp: string
): Promise<AuthResult> => {
  const result = await verifyOTP(phoneNumber, submittedOtp);

  if (!result.valid) {
    return { success: false, reason: result.reason ?? "Verification failed" };
  }

  // Check if auth user already exists
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existing = existingUsers?.users.find((u) => u.phone === phoneNumber);

  if (existing) {
    return { success: true, authUserId: existing.id };
  }

  // Create new Supabase Auth user with phone number
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    phone: phoneNumber,
    phone_confirm: true,
  });

  if (error) throw error;

  return { success: true, authUserId: data.user.id };
};

// ─── RECRUITER (Email / Password) ─────────────────────────

export const signUpRecruiter = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
  });

  if (error) return { success: false, reason: error.message };

  return { success: true, authUserId: data.user.id };
};

export const signInRecruiter = async (
  email: string,
  password: string
): Promise<SignInResult> => {
  const { createClient } = await import("@supabase/supabase-js");
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import("../config/env");

  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { success: false, reason: error.message };

  return { success: true, session: data.session };
};