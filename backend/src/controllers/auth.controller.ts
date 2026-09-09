
import type { Request, Response } from "express";

import {
    AUTH_SESSION_DURATION_MILLISECONDS,
    JWT_COOKIE_NAME,
    JWT_COOKIE_OPTIONS,
} from "../config/auth.js";
import {
    EmailAlreadyRegisteredError,
    EmailVerificationError,
    EmailVerificationResendError,
    EmailVerificationRequiredError,
    InvalidCredentialsError,
} from "../errors/auth.errors.js";
import {
    getCurrentUser,
    loginUser,
    registerUser,
    resendEmailVerification,
    verifyUserEmail,
} from "../services/auth.service.js";
import type { AuthenticatedRequest } from "../types/authenticated-request.js";
import type {
    LoginBody,
    RegisterBody,
    ResendEmailVerificationBody,
    VerifyEmailQuery,
} from "../validations/auth.validation.js";

const login = async (
    req: Request<Record<string, never>, unknown, LoginBody>,
    res: Response,
) => {
    try {
        const result = await loginUser(req.body);

        res.cookie(JWT_COOKIE_NAME, result.token, {
            ...JWT_COOKIE_OPTIONS,
            maxAge: AUTH_SESSION_DURATION_MILLISECONDS,
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: result.user,
        });
    } catch (error) {
        if (error instanceof InvalidCredentialsError) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password",
            });
        }

        if (error instanceof EmailVerificationRequiredError) {
            return res.status(403).json({
                success: false,
                error: "Verify your email before logging in",
            });
        }

        return res.status(500).json({ success: false, error: "Something went wrong on our end" });
    }
};

const resendVerificationEmail = async (
    req: Request<Record<string, never>, unknown, ResendEmailVerificationBody>,
    res: Response,
) => {
    try {
        await resendEmailVerification(req.body.email);

        return res.status(202).json({
            success: true,
            message: "If an unverified account exists, a verification email has been sent",
        });
    } catch (error) {
        if (error instanceof EmailVerificationResendError) {
            if (error.reason === "ALREADY_VERIFIED") {
                return res.status(409).json({
                    success: false,
                    error: "This email address is already verified",
                });
            }

            return res.status(429).json({
                success: false,
                error: "Please wait before requesting another verification email",
                retryAfterSeconds: error.retryAfterSeconds,
            });
        }

        return res.status(500).json({
            success: false,
            error: "Something went wrong on our end",
        });
    }
};

const verifyEmail = async (
    req: Request<Record<string, never>, unknown, unknown, VerifyEmailQuery>,
    res: Response,
) => {
    try {
        await verifyUserEmail(req.query.token);

        return res.status(200).json({
            success: true,
            message: "Email verified. You can now log in.",
        });
    } catch (error) {
        if (error instanceof EmailVerificationError) {
            return res.status(error.reason === "EXPIRED" ? 410 : 400).json({
                success: false,
                error:
                    error.reason === "EXPIRED"
                        ? "Verification link has expired"
                        : "Verification link is invalid",
            });
        }

        return res.status(500).json({
            success: false,
            error: "Something went wrong on our end",
        });
    }
};

const logout = (_req: Request, res: Response) => {
    res.clearCookie(JWT_COOKIE_NAME, JWT_COOKIE_OPTIONS);

    return res.status(200).json({
        success: true,
        message: "Logout successful",
    });
};

const me = async (req: AuthenticatedRequest, res: Response) => {
    const result = await getCurrentUser(req.user.id);

    if (!result) {
        return res.status(401).json({
            success: false,
            error: "Authentication required",
        });
    }

    return res.status(200).json({
        success: true,
        workspaces: result.workspaces,
        user: result.user,
    });
};

const register = async (
    req: Request<Record<string, never>, unknown, RegisterBody>,
    res: Response,
) => {
    try {
        await registerUser(req.body);

        return res.status(201).json({
            success: true,
            message: "Account created",
        });
    } catch (error) {
        if (error instanceof EmailAlreadyRegisteredError) {
            return res.status(409).json({
                success: false,
                error: "Email already exists",
            });
        }

        return res.status(500).json({
            success: false,
            error: "Something went wrong on our end",
        });
    }
};

export { login, logout, me, register, resendVerificationEmail, verifyEmail };
