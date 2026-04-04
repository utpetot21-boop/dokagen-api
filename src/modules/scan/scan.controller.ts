import { Request, Response, NextFunction } from 'express';
import * as svc from './scan.service';
import { SimpanScanSchema } from './scan.schema';
import {
  sendSuccess, sendCreated, sendError,
  sendNotFound, sendValidationError,
} from '../../utils/response';

// Helper: ambil perusahaanId milik user yang login
async function getPerusahaanId(userId: string): Promise<string | null> {
  const { default: prisma } = await import('../../lib/prisma');
  const p = await prisma.perusahaan.findFirst({
    where: { userId },
    select: { id: true },
  });
  return p?.id ?? null;
}

// ── POST /api/scan/simpan — terima PDF multipart ──────────────────────────────

export async function simpan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const perusahaanId = await getPerusahaanId(req.user!.userId);
    if (!perusahaanId) { sendError(res, 'Perusahaan tidak ditemukan', 404); return; }

    // Validasi metadata dari form fields
    const parsed = SimpanScanSchema.safeParse(req.body);
    if (!parsed.success) { sendValidationError(res, parsed.error.flatten()); return; }

    // File PDF dari multer
    const file = req.file;
    if (!file) { sendError(res, 'File PDF diperlukan', 400); return; }

    const record = await svc.simpan(
      perusahaanId,
      req.user!.userId,
      parsed.data,
      file.buffer,
      file.originalname,
    );

    sendCreated(res, record, 'Scan berhasil disimpan');
  } catch (err) { next(err); }
}

// ── GET /api/scan — list riwayat ──────────────────────────────────────────────

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const perusahaanId = await getPerusahaanId(req.user!.userId);
    if (!perusahaanId) { sendError(res, 'Perusahaan tidak ditemukan', 404); return; }

    const page  = parseInt(String(req.query.page  ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '20'), 10);

    const result = await svc.list(perusahaanId, page, limit);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

// ── GET /api/scan/:id — detail ────────────────────────────────────────────────

export async function detail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const perusahaanId = await getPerusahaanId(req.user!.userId);
    if (!perusahaanId) { sendError(res, 'Perusahaan tidak ditemukan', 404); return; }

    const record = await svc.getById(req.params.id, perusahaanId);
    if (!record) { sendNotFound(res, 'Data scan tidak ditemukan'); return; }

    sendSuccess(res, record);
  } catch (err) { next(err); }
}

// ── DELETE /api/scan/:id — hapus ──────────────────────────────────────────────

export async function hapus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const perusahaanId = await getPerusahaanId(req.user!.userId);
    if (!perusahaanId) { sendError(res, 'Perusahaan tidak ditemukan', 404); return; }

    const result = await svc.hapus(req.params.id, perusahaanId);
    if (!result) { sendNotFound(res, 'Data scan tidak ditemukan'); return; }

    sendSuccess(res, null, 'Scan dihapus');
  } catch (err) { next(err); }
}

// ── POST /api/scan/:id/lampirkan — lampirkan ke dokumen ───────────────────────

export async function lampirkan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const perusahaanId = await getPerusahaanId(req.user!.userId);
    if (!perusahaanId) { sendError(res, 'Perusahaan tidak ditemukan', 404); return; }

    const { dokumenId } = req.body;
    if (!dokumenId) { sendError(res, 'dokumenId diperlukan', 400); return; }

    const result = await svc.lampirkan(req.params.id, perusahaanId, dokumenId);
    if (!result) { sendNotFound(res, 'Data scan tidak ditemukan atau tidak ada PDF'); return; }

    sendCreated(res, result, 'Scan dilampirkan ke dokumen');
  } catch (err) { next(err); }
}
