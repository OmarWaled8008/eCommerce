import express from "express";
import { dbConnection } from "./Database/dbConnection.js";
import { bootstrap } from "./src/bootstrap.js";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import { webHookHandler } from "./src/modules/order/payment.controller.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

// app.post("/webhook", express.raw({ type: "application/json" }), webHookHandler);
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  console.log("Webhook route hit");
  res.status(200).send("ok");
});
app.use(cors());


app.use(express.json());
app.use(morgan("dev"));
app.use(express.static("uploads"));

bootstrap(app);
dbConnection();
app.listen(process.env.PORT || port, () =>
  console.log(`Example app listening on port ${port}!`)
);
