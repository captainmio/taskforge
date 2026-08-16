
import type { Request, Response } from "express";

import {
    AUTH_SESSION_DURATION_SECONDS,
    JWT_COOKIE_NAME,
    JWT_COOKIE_OPTIONS,
} from "../config/auth.js";
import { prisma } from "../config/database.js";
import {
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
} from "../errors/auth.errors.js";
import { loginUser, registerUser } from "../services/auth.service.js";
import type {
    LoginBody,
    RegisterBody,
} from "../validations/auth.validation.js";

const login = async (
    req: Request<Record<string, never>, unknown, LoginBody>,
    res: Response,
) => {
    try {
        const result = await loginUser(req.body);

        res.cookie(JWT_COOKIE_NAME, result.token, {
            ...JWT_COOKIE_OPTIONS,
            maxAge: AUTH_SESSION_DURATION_SECONDS * 1000,
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

        return res.status(500).json({ success: false, error: "Something went wrong on our end" });
    }
};

const me = async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: "Authentication required",
        });
    }

    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, firstname: true, lastname: true },
    });

    return res.status(200).json({
        success: true,
        workspaceIds: [],
        user,
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

export { login, me, register };
