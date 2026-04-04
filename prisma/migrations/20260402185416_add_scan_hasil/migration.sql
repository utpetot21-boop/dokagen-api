-- CreateTable
CREATE TABLE "scan_hasil" (
    "id" UUID NOT NULL,
    "perusahaan_id" UUID NOT NULL,
    "namaFile" VARCHAR(255) NOT NULL,
    "jumlah_halaman" INTEGER NOT NULL DEFAULT 1,
    "ukuran_kb" INTEGER,
    "kualitas" VARCHAR(20) NOT NULL DEFAULT 'standar',
    "ukuran_kertas" VARCHAR(10) NOT NULL DEFAULT 'A4',
    "pdf_url" TEXT,
    "dibuat_oleh" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scan_hasil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_scan_perusahaan" ON "scan_hasil"("perusahaan_id");

-- AddForeignKey
ALTER TABLE "scan_hasil" ADD CONSTRAINT "scan_hasil_perusahaan_id_fkey" FOREIGN KEY ("perusahaan_id") REFERENCES "perusahaan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
