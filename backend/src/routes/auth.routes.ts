import Router, {type Request, type Response} from 'express';
import { register, login, me } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { authenticatedHandler } from '../middlewares/authenticatedHandler.js';
import { loginSchema, registerSchema } from '../validations/auth.validation.js';

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/register", validate(registerSchema) , register);
router.get("/me", requireAuth, authenticatedHandler(me));

export default router;
