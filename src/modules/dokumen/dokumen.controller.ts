import { Request, Response, NextFunction } from 'express';
import * as dokumenService from './dokumen.service';
import * as pdfService from '../pdf/pdf.service';
import { sendSuccess, sendCreated } from '../../utils/response';
import { KirimEmailSchema } from './dokumen.schema';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await dokumenService.list(req.user!.perusahaanId!, req.query as any);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await dokumenService.getById(req.params.id, req.user!.perusahaanId!);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await dokumenService.create(
      req.user!.perusahaanId!, req.user!.userId, req.body,
    );
    sendCreated(res, result, 'Dokumen berhasil dibuat');
  } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await dokumenService.update(req.params.id, req.user!.perusahaanId!, req.body);
    sendSuccess(res, result, 'Dokumen berhasil diperbarui');
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await dokumenService.remove(req.params.id, req.user!.perusahaanId!);
    sendSuccess(res, null, 'Dokumen berhasil dihapus');
  } catch (err) { next(err); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await dokumenService.updateStatus(
      req.params.id, req.user!.perusahaanId!, req.body,
    );
    sendSuccess(res, result, 'Status berhasil diperbarui');
  } catch (err) { next(err); }
}

export async function getPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const docData = await dokumenService.buildDokumenData(req.params.id, req.user!.perusahaanId!);
    const pdfBuffer = await pdfService.generatePdf(docData);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${docData.nomor}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) { next(err); }
}

export async function addPembayaran(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await dokumenService.addPembayaran(
      req.params.id, req.user!.perusahaanId!, req.user!.userId, req.body,
    );
    sendCreated(res, result, 'Pembayaran berhasil dicatat');
  } catch (err) { next(err); }
}

export async function getPembayaran(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await dokumenService.getPembayaran(req.params.id, req.user!.perusahaanId!);
    sendSuccess(res, result);
  } catch (err) { next(err); }
}

export async function kirimDokumen(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = KirimEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(422).json({ success: false, message: 'Validasi gagal', errors: parsed.error.flatten().fieldErrors });
      return;
    }
    const result = await dokumenService.kirimDokumen(
      req.params.id, req.user!.perusahaanId!, parsed.data,
    );
    sendSuccess(res, result, `Dokumen berhasil dikirim ke ${result.email}`);
  } catch (err) { next(err); }
}
