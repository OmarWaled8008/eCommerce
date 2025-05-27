import express from "express";
import { webHookHandler } from "../order/payment.controller.js";
import bodyParser from "body-parser";
const router = express.Router();

router.post(
  "/payments",
  bodyParser.raw({ type: "application/json" }),
  webHookHandler
);

export default router;
