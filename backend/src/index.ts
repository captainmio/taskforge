import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

// list of routes
import apiRoute from "./routes/index.route.js"

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
    origin: process.env.FRONTEND_API,
    credentials: true,
}));
app.use(express.json());

app.use("/api", apiRoute);

app.listen(port, () => {
    console.log(`=============================================`)
    console.log(`==== SERVER IS NOW RUNNING AT PORT: ${port} ====`)
    console.log(`=============================================`)
})

