/**
 * Scan Service — simpan, list, detail, hapus hasil scan
 *
 * PDF disimpan di: uploads/scan/<perusahaanId>/<filename>
 * URL disimpan di kolom pdf_url: /uploads/scan/<perusahaanId>/<filename>
 */

import fs from 'fs/promises';
import path from 'path';
import prisma from '../../lib/prisma';
import { SimpanScanInput } from './scan.schema';

// Direktori penyimpanan file PDF scan
const UPLOAD_BASE = path.join(process.cwd(), 'uploads', 'scan');

// Pastikan direktori ada
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

// ── Simpan hasil scan ─────────────────────────────────────────────────────────

export async function simpan(
  perusahaanId: string,
  dibuatOleh: string,
  input: SimpanScanInput,
  fileBuffer: Buffer,
  originalName: string,
) {
  const dir = path.join(UPLOAD_BASE, perusahaanId);
  await ensureDir(dir);

  // Nama file unik: timestamp + original
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}_${safeName}`;
  const filePath = path.join(dir, fileName);

  await fs.writeFile(filePath, fileBuffer);

  const pdfUrl = `/uploads/scan/${perusahaanId}/${fileName}`;
  const ukuranKb = input.ukuranKb ?? Math.round(fileBuffer.length / 1024);

  const record = await prisma.scanHasil.create({
    data: {
      perusahaanId,
      dibuatOleh,
      namaFile:      input.namaFile,
      jumlahHalaman: input.jumlahHalaman,
      ukuranKb,
      kualitas:      input.kualitas,
      ukuranKertas:  input.ukuranKertas,
      pdfUrl,
    },
  });

  return record;
}

// ── List riwayat scan ─────────────────────────────────────────────────────────

export async function list(
  perusahaanId: string,
  page = 1,
  limit = 20,
) {
  const [items, total] = await Promise.all([
    prisma.scanHasil.findMany({
      where: { perusahaanId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.scanHasil.count({ where: { perusahaanId } }),
  ]);

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Detail satu scan ──────────────────────────────────────────────────────────

export async function getById(id: string, perusahaanId: string) {
  return prisma.scanHasil.findFirst({ where: { id, perusahaanId } });
}

// ── Hapus scan ────────────────────────────────────────────────────────────────

export async function hapus(id: string, perusahaanId: string) {
  const record = await prisma.scanHasil.findFirst({
    where: { id, perusahaanId },
  });
  if (!record) return null;

  // Hapus file fisik
  if (record.pdfUrl) {
    const filePath = path.join(process.cwd(), record.pdfUrl);
    await fs.unlink(filePath).catch(() => {}); // silent jika file tidak ada
  }

  return prisma.scanHasil.delete({ where: { id } });
}

// ── Lampirkan ke dokumen ──────────────────────────────────────────────────────

export async function lampirkan(
  id: string,
  perusahaanId: string,
  dokumenId: string,
) {
  const record = await prisma.scanHasil.findFirst({
    where: { id, perusahaanId },
  });
  if (!record || !record.pdfUrl) return null;

  // Tambah ke dokumen_lampiran
  const lampiran = await prisma.dokumenLampiran.create({
    data: {
      dokumenId,
      tipe: 'scan',
      namaFile: `${record.namaFile}.pdf`,
      url: record.pdfUrl,
      ukuranKb: record.ukuranKb ?? undefined,
    },
  });

  return lampiran;
}
