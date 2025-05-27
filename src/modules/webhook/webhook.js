import express from "express";
import { webHookHandler } from "../order/payment.controller";
const router = express.Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  webHookHandler
);

export default router;
