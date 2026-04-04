import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation error
  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'Data tidak valid',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  // Prisma unique constraint
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({
      success: false,
      message: 'Data sudah ada (duplikat)',
    });
    return;
  }

  // Prisma record not found
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({
      success: false,
      message: 'Data tidak ditemukan',
    });
    return;
  }

  // Generic error
  const message =
    err instanceof Error ? err.message : 'Terjadi kesalahan pada server';

  console.error('[DokaGen API Error]', err);
  res.status(500).json({ success: false, message });
}
