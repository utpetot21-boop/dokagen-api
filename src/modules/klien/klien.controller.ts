import { Request, Response, NextFunction } from 'express';
import * as klienService from './klien.service';
import { sendSuccess, sendCreated, sendSuccess as sendDeleted } from '../../utils/response';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await klienService.list(req.user!.perusahaanId!, req.query as any);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await klienService.getById(req.params.id, req.user!.perusahaanId!);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await klienService.create(req.user!.perusahaanId!, req.body);
    sendCreated(res, result, 'Klien berhasil ditambahkan');
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await klienService.update(req.params.id, req.user!.perusahaanId!, req.body);
    sendSuccess(res, result, 'Klien berhasil diperbarui');
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await klienService.remove(req.params.id, req.user!.perusahaanId!);
    sendSuccess(res, null, 'Klien berhasil dinonaktifkan');
  } catch (err) { next(err); }
}

export async function getDokumen(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await klienService.getDokumen(req.params.id, req.user!.perusahaanId!, req.query as any);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}
