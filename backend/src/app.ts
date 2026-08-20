import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { httpLogger } from "./middlewares/httpLogger.js";
import apiRoute from "./routes/index.route.js";

const app = express();

// Register logging before other middleware so validation, authorization, and
// route failures all produce the same structured request-completion event.
app.use(httpLogger);
app.use(cors({
  origin: env.FRONTEND_API,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use("/api", apiRoute);

export default app;
