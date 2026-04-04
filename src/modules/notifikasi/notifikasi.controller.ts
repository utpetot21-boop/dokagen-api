import { Request, Response, NextFunction } from 'express';
import * as svc from './notifikasi.service';
import { jalankanCronJatuhTempo } from './cron.service';
import { sendSuccess, sendError } from '../../utils/response';

// ── List notifikasi ────────────────────────────────────────────────────────

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filter = (req.query.filter as string) ?? 'semua';
    const page   = parseInt(String(req.query.page ?? '1'), 10);
    const limit  = parseInt(String(req.query.limit ?? '30'), 10);
    const result = await svc.list(req.user!.userId, filter as any, page, limit);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

// ── Unread count ───────────────────────────────────────────────────────────

export async function unreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await svc.getUnreadCount(req.user!.userId);
    sendSuccess(res, { count });
  } catch (err) { next(err); }
}

// ── Tandai dibaca ──────────────────────────────────────────────────────────

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.markRead(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Notifikasi ditandai dibaca');
  } catch (err) { next(err); }
}

export async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.markAllRead(req.user!.userId);
    sendSuccess(res, null, 'Semua notifikasi ditandai dibaca');
  } catch (err) { next(err); }
}

// ── Hapus ──────────────────────────────────────────────────────────────────

export async function hapusSatu(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.hapusSatu(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Notifikasi dihapus');
  } catch (err) { next(err); }
}

export async function hapusSemua(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await svc.hapusSemua(req.user!.userId);
    sendSuccess(res, null, 'Notifikasi yang sudah dibaca dihapus');
  } catch (err) { next(err); }
}

// ── FCM Token ──────────────────────────────────────────────────────────────

export async function daftarFcmToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, deviceInfo } = req.body;
    if (!token) { sendError(res, 'token diperlukan', 400); return; }
    await svc.daftarFcmToken(req.user!.userId, token, deviceInfo);
    sendSuccess(res, null, 'Token terdaftar');
  } catch (err) { next(err); }
}

export async function hapusFcmToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.body;
    if (!token) { sendError(res, 'token diperlukan', 400); return; }
    await svc.hapusFcmToken(token);
    sendSuccess(res, null, 'Token dihapus');
  } catch (err) { next(err); }
}

// ── Setting ────────────────────────────────────────────────────────────────

export async function getSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const setting = await svc.getSetting(req.user!.userId);
    sendSuccess(res, setting);
  } catch (err) { next(err); }
}

export async function updateSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const setting = await svc.updateSetting(req.user!.userId, req.body);
    sendSuccess(res, setting, 'Pengaturan disimpan');
  } catch (err) { next(err); }
}

// ── Internal: trigger cron manual (dev/ops) ────────────────────────────────

export async function triggerCron(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Hanya izinkan di non-production atau dengan internal key
    const internalKey = req.headers['x-internal-key'];
    if (process.env.NODE_ENV === 'production' && internalKey !== process.env.INTERNAL_API_KEY) {
      sendError(res, 'Tidak diizinkan', 403);
      return;
    }
    const result = await jalankanCronJatuhTempo();
    sendSuccess(res, result, 'Cron dijalankan');
  } catch (err) { next(err); }
}
