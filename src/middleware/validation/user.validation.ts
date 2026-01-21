import { z } from "zod";

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    email: z.string().email().optional(),
    phoneNumber: z.string().min(10).max(15).optional(),
  }).strict(),
});

export const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(100),
  }),
});

export const adminUpdateUserSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    email: z.string().email().optional(),
    roleId: z.string().uuid().optional(),
    organizationId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().optional(),
    phoneNumber: z.string().optional().nullable(),
  }).strict(),
});