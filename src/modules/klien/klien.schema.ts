import { z } from 'zod';

export const KlienSchema = z.object({
  tipe: z.enum(['perusahaan', 'personal']).default('perusahaan'),
  nama: z.string().min(2, 'Nama minimal 2 karakter'),
  alamat: z.string().optional(),
  kota: z.string().optional(),
  provinsi: z.string().optional(),
  kodePos: z.string().max(10).optional(),
  npwp: z.string().max(30).optional(),
  noTelp: z.string().max(20).optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  contactPerson: z.string().optional(),
  catatan: z.string().optional(),
});

export const UpdateKlienSchema = KlienSchema.partial();

export type KlienInput = z.infer<typeof KlienSchema>;
export type UpdateKlienInput = z.infer<typeof UpdateKlienSchema>;
