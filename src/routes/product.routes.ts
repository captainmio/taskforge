
import Router, {type Request, type Response} from 'express';
import { getProducts } from '../controllers/product.controller.js';

const router = Router();

router.get("/", getProducts);

export default router;