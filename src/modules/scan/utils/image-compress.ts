/**
 * Image Compress Utility
 *
 * Menggunakan sharp untuk:
 * - Resize gambar berdasarkan kualitas (draft/standar/tinggi)
 * - Kompres JPEG dengan quality level yang sesuai
 * - Konversi ke grayscale (mode hitam-putih)
 */

import sharp from 'sharp';

// Pemetaan kualitas → JPEG quality (0-100)
const QUALITY_MAP: Record<string, number> = {
  draft:   55,
  standar: 75,
  tinggi:  90,
};

// Pemetaan kualitas → lebar maksimal gambar (px)
const WIDTH_MAP: Record<string, number> = {
  draft:   1200,
  standar: 1800,
  tinggi:  2480,  // setara A4 @ 300dpi
};

export interface CompressOptions {
  kualitas: 'draft' | 'standar' | 'tinggi';
  grayscale?: boolean;  // mode hitam-putih
}

/**
 * Kompres satu gambar berdasarkan kualitas
 * @param input  Buffer gambar asli (JPEG/PNG/WebP)
 * @param opts   Opsi kualitas dan mode warna
 * @returns      Buffer JPEG hasil kompres
 */
export async function kompresGambar(
  input: Buffer,
  opts: CompressOptions,
): Promise<Buffer> {
  const q    = QUALITY_MAP[opts.kualitas] ?? 75;
  const maxW = WIDTH_MAP[opts.kualitas]   ?? 1800;

  let pipeline = sharp(input)
    .resize({ width: maxW, withoutEnlargement: true });

  if (opts.grayscale) {
    pipeline = pipeline.grayscale();
  }

  return pipeline
    .jpeg({ quality: q, progressive: true })
    .toBuffer();
}

/**
 * Kompres banyak gambar sekaligus (parallel)
 */
export async function kompresGambarBatch(
  buffers: Buffer[],
  opts: CompressOptions,
): Promise<Buffer[]> {
  return Promise.all(buffers.map((buf) => kompresGambar(buf, opts)));
}

/**
 * Estimasi ukuran file PDF berdasarkan jumlah halaman dan kualitas
 * (heuristik — dipakai di UI slider sebagai perkiraan)
 * @returns ukuran dalam KB
 */
export function estimasiUkuranKb(
  jumlahHalaman: number,
  kualitas: string,
  kompresiPersen: number,
): number {
  const BASE_KB: Record<string, number> = {
    draft:   80,
    standar: 200,
    tinggi:  500,
  };
  const base   = BASE_KB[kualitas] ?? 200;
  const faktor = 1 - kompresiPersen / 100;
  return Math.round(jumlahHalaman * base * faktor);
}
