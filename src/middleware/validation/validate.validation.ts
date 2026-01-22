// MODULE: Authentication Request Validation
// Provides strict schema enforcement for registration, login, and password recovery.

// HEADER: Imports & Setup
import { z } from "zod";
import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/appError"; // IMPORT: Leveraging centralized error class

// SECURITY: List of forbidden common passwords.
const commonPasswords = ["Password123", "Admin123", "Welcome123", "12345678"];

// HEADER: Registration Schema
export const registerSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email format"),
        password: z.string()
            .min(8, "Password must be at least 8 characters")
            .regex(/^[A-Z]/, "Password must start with a Capital letter")
            .refine((val: string) => !commonPasswords.includes(val), {
                message: "This password is too common and insecure",
            }),
        confirmPassword: z.string(),
        roleName: z.string().min(1, "Role name is required"),
        organizationName: z.string().optional(),
        phoneNumber: z.string().optional(),
    }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }),
});

// HEADER: Login Schema
export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(1, "Password is required"),
    }),
});

// HEADER: Password Reset Schema
export const resetPasswordSchema = z.object({
    body: z.object({
        password: z.string()
            .min(8, "Password must be at least 8 characters")
            .regex(/^[A-Z]/, "Password must start with a Capital letter")
            .refine((val: string) => !commonPasswords.includes(val), {
                message: "This password is too common and insecure",
            }),
        confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }),
});

// HEADER: Generic Validation Middleware
// API: Intercepts requests and pipes errors into the Global Error Handler.
export const validate = (schema: z.ZodSchema<any>) =>
    async (req: Request, _res: Response, next: NextFunction) => { // FIX: Prefixed with _ to resolve TS6133
        try {
            // PERF: parseAsync allows for potential asynchronous refinements.
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        } catch (error: any) {
            // FIX: Formatting Zod errors into a clean string for the AppError constructor.
            const errorMessages = error.errors?.map((err: any) => 
                `${err.path[err.path.length - 1]}: ${err.message}`
            ).join(", ");

            // SECURITY: Pass the error to the global handler. 
            // NOTE: We don't need 'res' here because the error handler will send the response.
            return next(new AppError(errorMessages || "Invalid input data", 400));
        }
    };