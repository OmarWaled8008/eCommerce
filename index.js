import express from "express";
import { dbConnection } from "./Database/dbConnection.js";
import { bootstrap } from "./src/bootstrap.js";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import { createOnlineOrder } from "./src/modules/order/order.controller.js";

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = express();
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  createOnlineOrder
);
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.use(express.static("uploads"));

bootstrap(app);
dbConnection();
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
