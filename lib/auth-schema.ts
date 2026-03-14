import { z } from "zod"

export const signInSchema = z.object({
    username: z.string().min(1, { message: "Login ID is required" }),
    password: z.string().min(1, { message: "Password is required" }),
})

export const signUpSchema = z.object({
    name: z.string()
        .min(6, { message: "Login ID must be at least 6 characters" })
        .max(12, { message: "Login ID must be at most 12 characters" }),
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string()
        .min(8, { message: "Password must be at least 8 characters" })
        .regex(/[a-z]/, { message: "Password must contain a lowercase letter" })
        .regex(/[A-Z]/, { message: "Password must contain an uppercase letter" })
        .regex(/[^a-zA-Z0-9]/, { message: "Password must contain a special character" }),
});

export const otpSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    otp: z.string().min(6, { message: "OTP must be 6 characters" }),
})

export const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
})
