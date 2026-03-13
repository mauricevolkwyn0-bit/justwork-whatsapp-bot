import { Request, Response } from "express";
import {
  initiateCandidateAuth,
  completeCandidateAuth,
  signUpRecruiter,
  signInRecruiter,
} from "../services/auth.service";

export const candidateSendOTP = async (req: Request, res: Response) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    res.status(400).json({ success: false, message: "phone_number is required" });
    return;
  }

  try {
    await initiateCandidateAuth(phone_number);
    res.json({ success: true, message: "OTP sent via WhatsApp" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
};

export const candidateVerifyOTP = async (req: Request, res: Response) => {
  const { phone_number, otp } = req.body;

  if (!phone_number || !otp) {
    res.status(400).json({ success: false, message: "phone_number and otp are required" });
    return;
  }

  try {
    const result = await completeCandidateAuth(phone_number, otp);

    if (!result.success) {
      res.status(401).json({ success: false, message: result.reason });
      return;
    }

    res.json({ success: true, auth_user_id: result.authUserId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Verification failed" });
  }
};

export const recruiterSignUp = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: "email and password are required" });
    return;
  }

  try {
    const result = await signUpRecruiter(email, password);

    if (!result.success) {
      res.status(400).json({ success: false, message: result.reason });
      return;
    }

    res.json({
      success: true,
      message: "Account created. Please check your email to verify.",
      auth_user_id: result.authUserId,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Signup failed" });
  }
};

export const recruiterSignIn = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ success: false, message: "email and password are required" });
    return;
  }

  try {
    const result = await signInRecruiter(email, password);

    if (!result.success) {
      res.status(401).json({ success: false, message: result.reason });
      return;
    }

    res.json({ success: true, session: result.session });
  } catch (error) {
    res.status(500).json({ success: false, message: "Sign in failed" });
  }
};