import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { CreateUserSchema, UpdateUserSchema } from './users.schema';
import { sendSuccess, sendCreated } from '../../utils/response';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const perusahaanId = req.user!.perusahaanId!;
    const users = await usersService.listUsers(perusahaanId);
    sendSuccess(res, users);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = CreateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validasi gagal', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const perusahaanId = req.user!.perusahaanId!;
    const user = await usersService.createUser(parsed.data, perusahaanId);
    sendCreated(res, user, 'User berhasil dibuat');
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = UpdateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validasi gagal', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const { id } = req.params;
    const perusahaanId = req.user!.perusahaanId!;
    const requesterId = req.user!.userId;
    const user = await usersService.updateUser(id, parsed.data, perusahaanId, requesterId);
    sendSuccess(res, user, 'User berhasil diperbarui');
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const perusahaanId = req.user!.perusahaanId!;
    const requesterId = req.user!.userId;
    await usersService.deleteUser(id, perusahaanId, requesterId);
    sendSuccess(res, null, 'User berhasil dinonaktifkan');
  } catch (err) { next(err); }
}
