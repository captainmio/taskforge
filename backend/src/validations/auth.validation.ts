import { z } from "zod";

export const authTokenPayloadSchema = z.object({
    sub: z.number().int().positive(),
    email: z.email(),
});

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

export const resendEmailVerificationSchema = z.object({
    body: z.object({
        email: z.string()
            .trim()
            .email("Please enter a valid email")
            .toLowerCase(),
    }),
});

export const verifyEmailSchema = z.object({
    query: z.object({
        token: z.string().min(1, "Verification token is required"),
    }),
});

export type RegisterBody = z.infer<typeof registerSchema>["body"];
export type LoginBody = z.infer<typeof loginSchema>["body"];
export type ResendEmailVerificationBody = z.infer<typeof resendEmailVerificationSchema>["body"];
export type VerifyEmailQuery = z.infer<typeof verifyEmailSchema>["query"];
