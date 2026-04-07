import { Request, Response, NextFunction } from 'express';
import * as perusahaanService from './perusahaan.service';
import { sendSuccess } from '../../utils/response';

export async function getBranding(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await perusahaanService.getBranding();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await perusahaanService.getByUserId(req.user!.userId, req.user!.perusahaanId);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await perusahaanService.update(req.user!.userId, req.body, req.user!.perusahaanId);
    sendSuccess(res, data, 'Data perusahaan berhasil diperbarui');
  } catch (err) {
    next(err);
  }
}

export async function uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'File tidak ditemukan' });
      return;
    }
    // URL dari storage — implementasi upload ke Supabase/S3 di Phase 2
    const logoUrl = (req.file as Express.Multer.File & { location?: string }).location
      ?? `/uploads/images/${req.file.filename}`;
    const data = await perusahaanService.updateLogoUrl(req.user!.userId, logoUrl, req.user!.perusahaanId);
    sendSuccess(res, { logoUrl: data.logoUrl }, 'Logo berhasil diunggah');
  } catch (err) {
    next(err);
  }
}

export async function uploadStempel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'File tidak ditemukan' });
      return;
    }
    const stempelUrl = (req.file as Express.Multer.File & { location?: string }).location
      ?? `/uploads/images/${req.file.filename}`;
    const data = await perusahaanService.updateStempelUrl(req.user!.userId, stempelUrl, req.user!.perusahaanId);
    sendSuccess(res, { stempelUrl: data.stempelUrl }, 'Stempel berhasil diunggah');
  } catch (err) {
    next(err);
  }
}

export async function uploadTtd(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'File tidak ditemukan' });
      return;
    }
    const ttdUrl = (req.file as Express.Multer.File & { location?: string }).location
      ?? `/uploads/images/${req.file.filename}`;
    const data = await perusahaanService.updateTtdUrl(req.user!.userId, ttdUrl, req.user!.perusahaanId);
    sendSuccess(res, { ttdUrl: data.ttdUrl }, 'Tanda tangan berhasil diunggah');
  } catch (err) {
    next(err);
  }
}
