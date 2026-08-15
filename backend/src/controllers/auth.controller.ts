
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

import type { Request, Response } from "express";

import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUNDS } from "../config/auth.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const register = async (req: Request, res: Response) => {
    const { email, firstname, lastname, password } = req.body;

    const searchUserByEmail = await prisma.user.findUnique({
        where: { email: email },
    });


    if(searchUserByEmail) {
        res.status(409).json({ error: 'Email already exists' });
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

        res.status(201).json({
            message: "Account created",
        });
        
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Something went wrong on our end' });
    }


};

export { register };
