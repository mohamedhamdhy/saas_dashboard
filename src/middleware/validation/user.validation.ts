// MODULE: User Management Validation Logic
// HEADER: Imports
import { z } from "zod";

// HEADER: Self-Service Update Schema
// SECURITY: Using .strict() to prevent "Mass Assignment" vulnerabilities.
// NOTE: Only allows users to modify non-sensitive profile fields.
export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name is too short").max(50).optional(),
    email: z.string().email("Invalid email format").optional(),
    phoneNumber: z.string().min(10).max(15).optional(),
  }).strict(),
});

// HEADER: Password Change Schema
// SECURITY: Enforces a minimum length of 8 to ensure entropy and defense against dictionary attacks.
export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters").max(100),
  }),
});

// HEADER: Administrative User Management Schema
// SECURITY: Allows modification of privileged fields like 'roleId' and 'isActive'.
// NOTE: Includes .nullable() for fields that can be explicitly cleared by an admin.
export const adminUpdateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    email: z.string().email().optional(),
    roleId: z.string().uuid("Invalid Role ID format").optional(),
    organizationId: z.string().uuid("Invalid Organization ID format").optional().nullable(),
    isActive: z.boolean().optional(),
    phoneNumber: z.string().optional().nullable(),
  }).strict(),
});