-- AlterEnum
ALTER TYPE "TipeDokumen" ADD VALUE 'kasbon';

-- AlterTable
ALTER TABLE "perusahaan" ADD COLUMN     "cabang_bank" VARCHAR(100),
ADD COLUMN     "counter_kasbon" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "jabatan_direktur" VARCHAR(100),
ADD COLUMN     "kode_dokumen" VARCHAR(15),
ADD COLUMN     "nama_direktur" VARCHAR(255),
ADD COLUMN     "prefix_kasbon" VARCHAR(10) NOT NULL DEFAULT 'SDP';
