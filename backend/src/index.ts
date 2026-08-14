import dotenv from 'dotenv';
import express from 'express';

// list of routes
import productRoutes from "./routes/product.routes.js"

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use("/products", productRoutes);

app.listen(port, () => {
    console.log(`=============================================`)
    console.log(`==== SERVER IS NOW RUNNING AT PORT: ${port} ====`)
    console.log(`=============================================`)
})

