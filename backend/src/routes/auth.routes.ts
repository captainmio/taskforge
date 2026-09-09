import Router, {type Request, type Response} from 'express';
import {
  register,
  login,
  logout,
  me,
  requestPasswordResetEmail,
  resendVerificationEmail,
  resetPasswordWithToken,
  verifyEmail,
} from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { authenticatedHandler } from '../middlewares/authenticatedHandler.js';
import {
  loginSchema,
  requestPasswordResetSchema,
  registerSchema,
  resendEmailVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validations/auth.validation.js';

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.post("/register", validate(registerSchema) , register);
router.post("/resend-verification", validate(resendEmailVerificationSchema), resendVerificationEmail);
router.get("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post("/password-reset/request", validate(requestPasswordResetSchema), requestPasswordResetEmail);
router.post("/password-reset", validate(resetPasswordSchema), resetPasswordWithToken);
router.get("/me", requireAuth, authenticatedHandler(me));

export default router;
