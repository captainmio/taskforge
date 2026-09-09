import Router, {type Request, type Response} from 'express';
import {
  register,
  login,
  logout,
  me,
  resendVerificationEmail,
  verifyEmail,
} from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { authenticatedHandler } from '../middlewares/authenticatedHandler.js';
import {
  loginSchema,
  registerSchema,
  resendEmailVerificationSchema,
  verifyEmailSchema,
} from '../validations/auth.validation.js';

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/register", validate(registerSchema) , register);
router.post("/resend-verification", validate(resendEmailVerificationSchema), resendVerificationEmail);
router.get("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.get("/me", requireAuth, authenticatedHandler(me));

export default router;
