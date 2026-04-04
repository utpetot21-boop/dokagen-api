import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Berhasil',
  statusCode = 200,
): Response {
  return res.status(statusCode).json({ success: true, message, data } satisfies ApiResponse<T>);
}

export function sendError(
  res: Response,
  message = 'Terjadi kesalahan',
  statusCode = 500,
  errors?: unknown,
): Response {
  return res.status(statusCode).json({ success: false, message, errors } satisfies ApiResponse);
}

export function sendCreated<T>(res: Response, data: T, message = 'Data berhasil dibuat'): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendNotFound(res: Response, message = 'Data tidak ditemukan'): Response {
  return sendError(res, message, 404);
}

export function sendUnauthorized(res: Response, message = 'Tidak terautentikasi'): Response {
  return sendError(res, message, 401);
}

export function sendForbidden(res: Response, message = 'Akses ditolak'): Response {
  return sendError(res, message, 403);
}

export function sendValidationError(res: Response, errors: unknown): Response {
  return sendError(res, 'Data tidak valid', 422, errors);
}
