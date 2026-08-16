import { z } from "zod";

export const registerSchema = z.object({
    body: z.object({
        firstname: z.string()
            .trim()
            .min(1, "First Name is required")
            .max(100, "First Name must be 100 characters or fewer"),
        lastname: z.string()
            .trim()
            .min(1, "Last Name is required")
            .max(100, "Last Name must be 100 characters or fewer"),
        email: z.string()
            .trim()
            .email("Please enter a valid email")
            .toLowerCase(),
        password: z.string().min(8, "Password should be more than 7 characters")
    })
})

export const loginSchema = z.object({
    body: z.object({
        email: z.string()
            .trim()
            .min(1, "Please enter your email")
            .email("Please enter a valid email")
            .toLowerCase(),
        password: z.string().min(1, "Please enter your password")
    })
})

export type RegisterBody = z.infer<typeof registerSchema>["body"];
