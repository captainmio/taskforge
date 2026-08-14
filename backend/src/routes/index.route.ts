import Router from 'express';
import auth from './auth.routes.js';

const router = Router();

router.use("/auth", auth);

export default router;