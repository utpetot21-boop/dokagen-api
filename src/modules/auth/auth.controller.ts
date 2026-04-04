import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { ChangePasswordSchema } from './auth.schema';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.register(req.body);
    sendCreated(res, result, 'Registrasi berhasil');
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body);
    sendSuccess(res, result, 'Login berhasil');
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.refreshTokens(req.body.refreshToken);
    sendSuccess(res, result, 'Token diperbarui');
  } catch (err) {
    next(err);
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  // Stateless JWT — client cukup hapus token lokal
  sendSuccess(res, null, 'Logout berhasil');
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = ChangePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validasi gagal', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    await authService.changePassword(req.user!.userId, parsed.data);
    sendSuccess(res, null, 'Password berhasil diubah');
  } catch (err) { next(err); }
}
