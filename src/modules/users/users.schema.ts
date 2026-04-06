import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Email tidak valid'),
  nama: z.string().min(2, 'Nama minimal 2 karakter').max(255),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  role: z.enum(['admin', 'staff']).default('staff'),
});

export const UpdateUserSchema = z.object({
  nama: z.string().min(2).max(255).optional(),
  role: z.enum(['admin', 'staff', 'owner']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Password minimal 8 karakter').optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
