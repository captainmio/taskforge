import dotenv from 'dotenv';
import express, {type Request, type Response} from 'express';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
    res.status(200).send('Hello from Express!');
});

app.listen(port, () => {
    console.log(`=============================================`)
    console.log(`==== SERVER IS NOW RUNNING AT PORT: ${port} ====`)
    console.log(`=============================================`)
})

