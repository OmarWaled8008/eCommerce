import express from "express";
import { dbConnection } from "./Database/dbConnection.js";
import { bootstrap } from "./src/bootstrap.js";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import webhookRouter from "./src/modules/webhook/webhook.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

app.use("/webhook", webhookRouter);

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.static("uploads"));

bootstrap(app);
dbConnection();
app.listen(process.env.PORT || port, () =>
  console.log(`Example app listening on port ${port}!`)
);
