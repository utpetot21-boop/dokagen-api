import { z } from 'zod';

const DokumenItemSchema = z.object({
  urutan: z.number().int().min(1).default(1),
  nama: z.string().min(1, 'Nama item wajib diisi'),
  deskripsi: z.string().optional(),
  satuan: z.string().default('pcs'),
  qty: z.number().positive('Qty harus > 0'),
  hargaSatuan: z.number().min(0),
  diskonPersen: z.number().min(0).max(100).default(0),
});

export const CreateDokumenSchema = z.object({
  tipe: z.enum(['invoice', 'sph', 'surat_hutang', 'kasbon']),
  klienId: z.string().uuid().optional(),
  judul: z.string().optional(),
  // Tanggal
  tanggalDokumen: z.string().optional(), // ISO date string
  tanggalJatuhTempo: z.string().optional(),
  // Finansial
  diskonPersen: z.number().min(0).max(100).default(0),
  pajakPersen: z.number().min(0).max(100).default(0),
  // Surat hutang
  nominalHutang: z.number().min(0).optional(),
  cicilanPerBulan: z.number().min(0).optional(),
  // Meta
  catatan: z.string().optional(),
  syaratKetentuan: z.string().optional(),
  tema: z.enum(['minimal', 'professional', 'modern']).default('professional'),
  items: z.array(DokumenItemSchema).min(0).default([]),
});

export const UpdateDokumenSchema = CreateDokumenSchema.partial();

export const UpdateStatusSchema = z.object({
  status: z.enum([
    'draft', 'terkirim', 'lunas', 'dibatalkan',
    'diterima', 'ditolak', 'kadaluarsa', 'aktif', 'jatuh_tempo',
  ]),
  tanggalLunas: z.string().optional(),
});

export const PembayaranSchema = z.object({
  tanggal: z.string().min(1, 'Tanggal wajib diisi'),
  jumlah: z.number().positive('Jumlah harus > 0'),
  metode: z.enum(['transfer', 'tunai', 'cek', 'giro', 'qris']).optional(),
  noReferensi: z.string().optional(),
  catatan: z.string().optional(),
});

export const KirimEmailSchema = z.object({
  email: z.string().email('Email tidak valid'),
  pesan: z.string().optional(),
});

export type CreateDokumenInput = z.infer<typeof CreateDokumenSchema>;
export type UpdateDokumenInput = z.infer<typeof UpdateDokumenSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
export type PembayaranInput = z.infer<typeof PembayaranSchema>;
export type KirimEmailInput = z.infer<typeof KirimEmailSchema>;
