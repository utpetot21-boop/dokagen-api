import { z } from 'zod';

// Schema untuk simpan hasil scan (terima metadata + file PDF di multipart)
export const SimpanScanSchema = z.object({
  namaFile:      z.string().min(1).max(255),
  jumlahHalaman: z.coerce.number().int().min(1).default(1),
  ukuranKb:      z.coerce.number().int().optional(),
  kualitas:      z.enum(['draft', 'standar', 'tinggi']).default('standar'),
  ukuranKertas:  z.enum(['A4', 'F4', 'Letter']).default('A4'),
});

export type SimpanScanInput = z.infer<typeof SimpanScanSchema>;
