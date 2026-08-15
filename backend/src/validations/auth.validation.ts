import { z } from "zod";

export const registerSchema = z.object({
    body: z.object({
        firstname: z.string().min(1, "First Name is required"),
        lastname: z.string().min(1, "Last Name is required"),
        email: z.email().min(1, "Email is required"),
        password: z.string().min(8, "Password should be more than 7 characters")
    })
})

// export type RegisterBody = z.infer<typeof registerSchema>["body"];