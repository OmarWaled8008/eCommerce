import express from "express";
import { createCheckOutSession, webHookHandler } from "./payment.controller.js";
import { allowedTo, protectedRoutes } from "../auth/auth.controller.js";
const router = express.Router();

router.post(
  "/create-checkout-session",
  protectedRoutes,
  allowedTo("user"),
  createCheckOutSession
);

router.post(
  "/",
  express.raw({ type: "application/json" }),
  webHookHandler
);
  
export default router;
