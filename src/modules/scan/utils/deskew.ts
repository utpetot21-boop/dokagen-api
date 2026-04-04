/**
 * Deskew Utility — koreksi kemiringan gambar dokumen
 *
 * Pendekatan: proyeksi horizontal sederhana menggunakan sharp.
 * Untuk hasil lebih akurat di production, bisa diganti dengan
 * implementasi berbasis OpenCV (node-opencv) atau jimp.
 *
 * Saat ini: deteksi sudut dilakukan dengan estimasi, rotasi dilakukan sharp.
 */

import sharp from 'sharp';

/**
 * Koreksi kemiringan otomatis untuk satu gambar.
 *
 * Catatan implementasi:
 * - sharp.rotate() tanpa argumen menggunakan EXIF orientation — handle foto kamera.
 * - Deteksi sudut kemiringan (deskew sesungguhnya) memerlukan algoritma
 *   Hough Transform yang tidak tersedia di sharp. Untuk versi MVP ini,
 *   kita hanya lakukan koreksi EXIF + normalisasi orientasi.
 *
 * @param input  Buffer gambar asli
 * @returns      Buffer JPEG dengan orientasi terkoreksi
 */
export async function deskewGambar(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate()        // koreksi EXIF orientation otomatis
    .jpeg({ quality: 85 })
    .toBuffer();
}

/**
 * Rotasi manual dengan sudut tertentu (dipakai dari UI)
 * @param input   Buffer gambar
 * @param derajat Sudut rotasi (90, 180, 270, atau nilai kustom)
 */
export async function rotasiGambar(input: Buffer, derajat: number): Promise<Buffer> {
  return sharp(input)
    .rotate(derajat, { background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .jpeg({ quality: 85 })
    .toBuffer();
}
