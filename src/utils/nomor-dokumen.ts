import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tipe dokumen yang didukung, termasuk kasbon (prefix SDP)
type TipeDokumen = 'invoice' | 'sph' | 'surat_hutang' | 'kasbon';

// Konversi angka bulan ke angka Romawi
function bulanKeRomawi(bulan: number): string {
  const romawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  return romawi[bulan - 1] ?? String(bulan);
}

// Bersihkan nama perusahaan untuk dijadikan kode dokumen fallback
// Contoh: "CV. Nustech Indonesia" → "NUSTECH"
function namaKeKodeFallback(nama: string): string {
  return nama
    .replace(/^(CV|PT|UD|PD|Firma|FA)\s*\.?\s*/i, '') // hapus prefix badan usaha
    .split(/\s+/)[0]                                    // ambil kata pertama
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')                         // hanya alfanumerik
    .substring(0, 10);                                  // maks 10 karakter
}

/**
 * Generate nomor dokumen otomatis.
 * Format: {PREFIX}-{COUNTER:4}/{KODE}/{BULAN_ROMAWI}/{TAHUN}
 * Contoh: INV-0005/NUSTECH/IV/2026
 *
 * Atomic update counter di tabel perusahaan.
 */
export async function generateNomorDokumen(
  perusahaanId: string,
  tipe: TipeDokumen,
): Promise<string> {
  const perusahaan = await prisma.perusahaan.findUniqueOrThrow({
    where: { id: perusahaanId },
    select: {
      nama: true,
      kodeDokumen: true,
      prefixInvoice: true,
      prefixSph: true,
      prefixSuratHutang: true,
      prefixKasbon: true,
      counterInvoice: true,
      counterSph: true,
      counterSuratHutang: true,
      counterKasbon: true,
    },
  });

  // Tentukan kode dokumen: gunakan kodeDokumen jika ada, fallback ke nama
  const kode = perusahaan.kodeDokumen?.trim()
    ? perusahaan.kodeDokumen.toUpperCase()
    : namaKeKodeFallback(perusahaan.nama);

  const sekarang = new Date();
  const tahun   = sekarang.getFullYear();
  const bulan   = bulanKeRomawi(sekarang.getMonth() + 1);

  let prefix: string;
  let counter: number;
  let updateData: Record<string, number>;

  if (tipe === 'invoice') {
    prefix     = perusahaan.prefixInvoice;
    counter    = perusahaan.counterInvoice;
    updateData = { counterInvoice: counter + 1 };
  } else if (tipe === 'sph') {
    prefix     = perusahaan.prefixSph;
    counter    = perusahaan.counterSph;
    updateData = { counterSph: counter + 1 };
  } else if (tipe === 'kasbon') {
    prefix     = perusahaan.prefixKasbon;
    counter    = perusahaan.counterKasbon;
    updateData = { counterKasbon: counter + 1 };
  } else {
    // surat_hutang
    prefix     = perusahaan.prefixSuratHutang;
    counter    = perusahaan.counterSuratHutang;
    updateData = { counterSuratHutang: counter + 1 };
  }

  await prisma.perusahaan.update({
    where: { id: perusahaanId },
    data: updateData,
  });

  const nomorPadded = String(counter).padStart(4, '0');
  return `${prefix}-${nomorPadded}/${kode}/${bulan}/${tahun}`;
}
