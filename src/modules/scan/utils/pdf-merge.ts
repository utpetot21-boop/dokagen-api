/**
 * PDF Merge Utility — gabungkan beberapa gambar menjadi satu file PDF
 *
 * Menggunakan pdf-lib untuk embed gambar JPEG ke halaman PDF.
 * Ukuran kertas yang didukung: A4, F4, Letter.
 */

import { PDFDocument, PDFPage } from 'pdf-lib';

// Ukuran kertas dalam poin (1 inch = 72pt, A4 = 210×297mm)
const UKURAN_KERTAS: Record<string, [number, number]> = {
  A4:     [595.28, 841.89],
  F4:     [595.28, 935.43],   // F4 = 215×330mm
  Letter: [612,    792],
};

export interface MergeOptions {
  ukuranKertas: 'A4' | 'F4' | 'Letter';
}

/**
 * Gabungkan array Buffer gambar JPEG menjadi satu PDF Buffer.
 *
 * Setiap gambar mendapat satu halaman. Gambar di-fit ke halaman
 * dengan menjaga aspek rasio (tidak dipotong/distorsi).
 *
 * @param images  Array buffer JPEG (tiap buffer = 1 halaman)
 * @param opts    Opsi ukuran kertas
 * @returns       Buffer PDF hasil gabungan
 */
export async function gabungkanKePdf(
  images: Buffer[],
  opts: MergeOptions,
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const [pageW, pageH] = UKURAN_KERTAS[opts.ukuranKertas] ?? UKURAN_KERTAS['A4'];

  for (const imgBuffer of images) {
    // Embed gambar sebagai JPEG
    const jpgImage = await pdf.embedJpg(imgBuffer);

    // Hitung dimensi fit-to-page (pertahankan aspek rasio)
    const { width: iw, height: ih } = jpgImage;
    const margin    = 20; // margin 20pt di semua sisi
    const availW    = pageW - margin * 2;
    const availH    = pageH - margin * 2;
    const ratioW    = availW / iw;
    const ratioH    = availH / ih;
    const ratio     = Math.min(ratioW, ratioH);
    const drawW     = iw * ratio;
    const drawH     = ih * ratio;
    const offsetX   = margin + (availW - drawW) / 2;
    const offsetY   = margin + (availH - drawH) / 2;

    const page: PDFPage = pdf.addPage([pageW, pageH]);
    page.drawImage(jpgImage, {
      x:      offsetX,
      y:      offsetY,
      width:  drawW,
      height: drawH,
    });
  }

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}
