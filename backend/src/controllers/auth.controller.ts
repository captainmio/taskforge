
import type { Request, Response } from "express";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { JWT_COOKIE_NAME, JWT_EXPIRES_IN, JWT_SECRET } from "../config/auth.js";
import { prisma } from "../config/database.js";
import { EmailAlreadyRegisteredError } from "../errors/auth.errors.js";
import { registerUser } from "../services/auth.service.js";
import type { RegisterBody } from "../validations/auth.validation.js";

const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        // Use the same response for a missing user and a wrong password.
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password",
            });
        }

        const token = jwt.sign(
            { sub: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN as StringValue }
        );

        res.cookie(JWT_COOKIE_NAME, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
                id: user.id,
                email: user.email,
                firstname: user.firstname,
                lastname: user.lastname,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: "Something went wrong on our end" });
    }
}

const me = async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
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
