import { Router } from "express";
import { getCandidates } from "../controllers/candidate.controller";

const router = Router();

router.get("/", getCandidates);

export default router;