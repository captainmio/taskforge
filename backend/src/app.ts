import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import apiRoute from "./routes/index.route.js";

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_API,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api", apiRoute);

export default app;
