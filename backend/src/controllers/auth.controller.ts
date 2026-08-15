
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

import type { Request, Response } from "express";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import { BCRYPT_SALT_ROUNDS } from "../config/auth.js";
import { JWT_COOKIE_NAME, JWT_EXPIRES_IN, JWT_SECRET } from "../config/auth.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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

const register = async (req: Request, res: Response) => {
    const { email, firstname, lastname, password } = req.body;

    const searchUserByEmail = await prisma.user.findUnique({
        where: { email: email },
    });


    if (searchUserByEmail) {
        return res.status(409).json({ success: false, error: 'Email already exists' });
    }

    try {

        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)

        await prisma.user.create({
            data: {
                email,
                firstname,
                lastname,
                password: passwordHash,
            },
        });

        return res.status(201).json({
            success: true,
            message: "Account created",
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({
            success: false, error: 'Something went wrong on our end'
        });
    }


};

export { login, me, register };
