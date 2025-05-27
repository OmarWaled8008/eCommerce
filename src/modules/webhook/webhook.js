import express from "express";
import { webHookHandler } from "../order/order.controller.js";
const router = express.Router();

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  webHookHandler
);

export default router;
