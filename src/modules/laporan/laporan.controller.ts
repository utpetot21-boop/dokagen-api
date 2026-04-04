import { Request, Response, NextFunction } from 'express';
import * as laporanService from './laporan.service';
import { sendSuccess } from '../../utils/response';

export async function ringkasan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await laporanService.getRingkasan(req.user!.perusahaanId!);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function pendapatanChart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const bulan = parseInt(req.query.bulan as string) || now.getMonth() + 1;
    const tahun = parseInt(req.query.tahun as string) || now.getFullYear();
    const result = await laporanService.getPendapatanChart(req.user!.perusahaanId!, bulan, tahun);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function dokumenStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await laporanService.getDokumenStats(req.user!.perusahaanId!);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function klienTerbaik(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const result = await laporanService.getKlienTerbaik(req.user!.perusahaanId!, limit);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const csv = await laporanService.exportDokumenCsv(req.user!.perusahaanId!);
    const filename = `dokagen-export-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
  } catch (err) { next(err); }
}
