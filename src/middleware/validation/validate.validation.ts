import { z } from "zod";
import { Request, Response, NextFunction } from "express";

const commonPasswords = ["Password123", "Admin123", "Welcome123", "12345678"];

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

export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid email format"),
        password: z.string().min(1, "Password is required"),
    }),
});

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

export const validate = (schema: z.ZodSchema<any>) =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            return next();
        } catch (error: any) {
            return res.status(400).json({
                status: "fail",
                errors: error.errors?.map((err: any) => ({
                    field: err.path[err.path.length - 1],
                    message: err.message
                })) || error.message
            });
        }
    };