import { Router } from "express";
import healthRoutes from "./health.routes";
import candidateRoutes from "./candidate.routes";
import authRoutes from "./auth.routes";
import webhookRoutes from "./webhook.routes";

const router = Router();
router.use("/health", healthRoutes);
router.use("/candidates", candidateRoutes);
router.use("/auth", authRoutes);
router.use("/webhook", webhookRoutes);
export default router;
