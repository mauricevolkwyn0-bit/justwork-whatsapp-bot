import { Router } from "express";
import {
  candidateSendOTP,
  candidateVerifyOTP,
  recruiterSignUp,
  recruiterSignIn,
} from "../controllers/auth.controller";

const router = Router();

// Candidate WhatsApp OTP
router.post("/candidate/send-otp", candidateSendOTP);
router.post("/candidate/verify-otp", candidateVerifyOTP);

// Recruiter email auth
router.post("/recruiter/signup", recruiterSignUp);
router.post("/recruiter/signin", recruiterSignIn);

export default router;