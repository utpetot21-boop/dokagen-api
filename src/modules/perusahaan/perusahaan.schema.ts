import { z } from 'zod';

export const UpdatePerusahaanSchema = z.object({
  // Identitas
  nama: z.string().min(2, 'Nama minimal 2 karakter').optional(),
  kodeDokumen: z.string().max(15).regex(/^[A-Z0-9]*$/, 'Kode hanya boleh huruf kapital dan angka').optional().or(z.literal('')),
  npwp: z.string().max(30).optional(),
  website: z.string().url('URL tidak valid').optional().or(z.literal('')),
  // Alamat & kontak
  alamat: z.string().optional(),
  kota: z.string().optional(),
  provinsi: z.string().optional(),
  kodePos: z.string().max(10).optional(),
  noTelp: z.string().max(20).optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  // Pengaturan dokumen
  matauang: z.string().max(10).optional(),
  formatTanggal: z.string().optional(),
  temaInvoice: z.enum(['minimal', 'professional', 'modern']).optional(),
  // Prefix & counter
  prefixInvoice: z.string().max(10).optional(),
  prefixSph: z.string().max(10).optional(),
  prefixSuratHutang: z.string().max(10).optional(),
  prefixKasbon: z.string().max(10).optional(),
  counterInvoice: z.number().int().min(1).optional(),
  counterSph: z.number().int().min(1).optional(),
  counterSuratHutang: z.number().int().min(1).optional(),
  counterKasbon: z.number().int().min(1).optional(),
  // Pajak
  pajakDefaultPersen: z.number().min(0).max(100).optional(),
  // Rekening bank
  namaBank: z.string().max(100).optional(),
  noRekening: z.string().max(50).optional(),
  atasNama: z.string().max(255).optional(),
  cabangBank: z.string().max(100).optional(),
  // Penanda tangan
  namaDirektur: z.string().max(255).optional(),
  jabatanDirektur: z.string().max(100).optional(),
});

export type UpdatePerusahaanInput = z.infer<typeof UpdatePerusahaanSchema>;
