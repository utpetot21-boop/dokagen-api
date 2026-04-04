-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('owner', 'admin', 'staff');

-- CreateEnum
CREATE TYPE "TemaInvoice" AS ENUM ('minimal', 'professional', 'modern');

-- CreateEnum
CREATE TYPE "TipeKlien" AS ENUM ('perusahaan', 'personal');

-- CreateEnum
CREATE TYPE "TipeDokumen" AS ENUM ('invoice', 'sph', 'surat_hutang');

-- CreateEnum
CREATE TYPE "StatusDokumen" AS ENUM ('draft', 'terkirim', 'lunas', 'dibatalkan', 'diterima', 'ditolak', 'kadaluarsa', 'aktif', 'jatuh_tempo');

-- CreateEnum
CREATE TYPE "TipeLampiran" AS ENUM ('foto', 'scan', 'pdf_pendukung');

-- CreateEnum
CREATE TYPE "MetodePembayaran" AS ENUM ('transfer', 'tunai', 'cek', 'giro', 'qris');

-- CreateEnum
CREATE TYPE "TipeNotifikasi" AS ENUM ('jatuh_tempo', 'pembayaran_diterima', 'dokumen_dikirim', 'pengingat');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'owner',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perusahaan" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "nama" VARCHAR(255) NOT NULL,
    "alamat" TEXT,
    "kota" VARCHAR(100),
    "provinsi" VARCHAR(100),
    "kode_pos" VARCHAR(10),
    "npwp" VARCHAR(30),
    "no_telp" VARCHAR(20),
    "email" VARCHAR(255),
    "website" VARCHAR(255),
    "logo_url" TEXT,
    "mata_uang" VARCHAR(10) NOT NULL DEFAULT 'IDR',
    "format_tanggal" VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
    "tema_invoice" "TemaInvoice" NOT NULL DEFAULT 'professional',
    "prefix_invoice" VARCHAR(10) NOT NULL DEFAULT 'INV',
    "prefix_sph" VARCHAR(10) NOT NULL DEFAULT 'SPH',
    "prefix_surat_hutang" VARCHAR(10) NOT NULL DEFAULT 'SH',
    "counter_invoice" INTEGER NOT NULL DEFAULT 1,
    "counter_sph" INTEGER NOT NULL DEFAULT 1,
    "counter_surat_hutang" INTEGER NOT NULL DEFAULT 1,
    "pajak_default_persen" DECIMAL(5,2) NOT NULL DEFAULT 11.00,
    "nama_bank" VARCHAR(100),
    "no_rekening" VARCHAR(50),
    "atas_nama" VARCHAR(255),
    "ttd_url" TEXT,
    "stempel_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perusahaan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "klien" (
    "id" UUID NOT NULL,
    "perusahaan_id" UUID NOT NULL,
    "tipe" "TipeKlien" NOT NULL DEFAULT 'perusahaan',
    "nama" VARCHAR(255) NOT NULL,
    "alamat" TEXT,
    "kota" VARCHAR(100),
    "provinsi" VARCHAR(100),
    "kode_pos" VARCHAR(10),
    "npwp" VARCHAR(30),
    "no_telp" VARCHAR(20),
    "email" VARCHAR(255),
    "contact_person" VARCHAR(255),
    "catatan" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "klien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dokumen" (
    "id" UUID NOT NULL,
    "perusahaan_id" UUID NOT NULL,
    "klien_id" UUID,
    "tipe" "TipeDokumen" NOT NULL,
    "nomor" VARCHAR(50) NOT NULL,
    "status" "StatusDokumen" NOT NULL DEFAULT 'draft',
    "judul" VARCHAR(255),
    "klien_nama" VARCHAR(255),
    "klien_alamat" TEXT,
    "klien_npwp" VARCHAR(30),
    "klien_email" VARCHAR(255),
    "klien_no_telp" VARCHAR(20),
    "tanggal_dokumen" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tanggal_jatuh_tempo" DATE,
    "tanggal_terkirim" TIMESTAMP(3),
    "tanggal_lunas" TIMESTAMP(3),
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "diskon_persen" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "diskon_nominal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "pajak_persen" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "pajak_nominal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "nominal_hutang" DECIMAL(15,2),
    "cicilan_per_bulan" DECIMAL(15,2),
    "pdf_url" TEXT,
    "catatan" TEXT,
    "syarat_ketentuan" TEXT,
    "tema" "TemaInvoice" NOT NULL DEFAULT 'professional',
    "dibuat_oleh" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dokumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dokumen_item" (
    "id" UUID NOT NULL,
    "dokumen_id" UUID NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 1,
    "nama" VARCHAR(255) NOT NULL,
    "deskripsi" TEXT,
    "satuan" VARCHAR(50) NOT NULL DEFAULT 'pcs',
    "qty" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "harga_satuan" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "diskon_persen" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "dokumen_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dokumen_lampiran" (
    "id" UUID NOT NULL,
    "dokumen_id" UUID NOT NULL,
    "tipe" "TipeLampiran" NOT NULL DEFAULT 'foto',
    "nama_file" VARCHAR(255),
    "url" TEXT NOT NULL,
    "ukuran_kb" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dokumen_lampiran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pembayaran" (
    "id" UUID NOT NULL,
    "dokumen_id" UUID NOT NULL,
    "tanggal" DATE NOT NULL,
    "jumlah" DECIMAL(15,2) NOT NULL,
    "metode" "MetodePembayaran",
    "no_referensi" VARCHAR(100),
    "bukti_url" TEXT,
    "catatan" TEXT,
    "dibuat_oleh" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifikasi" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "dokumen_id" UUID,
    "tipe" "TipeNotifikasi" NOT NULL,
    "judul" VARCHAR(255) NOT NULL,
    "pesan" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_pdf" (
    "id" UUID NOT NULL,
    "perusahaan_id" UUID,
    "nama" VARCHAR(100) NOT NULL,
    "tipe_dokumen" "TipeDokumen" NOT NULL,
    "tema" "TemaInvoice" NOT NULL,
    "html_template" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_aktif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "template_pdf_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "aksi" VARCHAR(100) NOT NULL,
    "tabel" VARCHAR(50),
    "record_id" UUID,
    "data_lama" JSONB,
    "data_baru" JSONB,
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_klien_perusahaan" ON "klien"("perusahaan_id");

-- CreateIndex
CREATE INDEX "idx_dokumen_perusahaan" ON "dokumen"("perusahaan_id");

-- CreateIndex
CREATE INDEX "idx_dokumen_klien" ON "dokumen"("klien_id");

-- CreateIndex
CREATE INDEX "idx_dokumen_tipe_status" ON "dokumen"("tipe", "status");

-- CreateIndex
CREATE INDEX "idx_dokumen_jatuh_tempo" ON "dokumen"("tanggal_jatuh_tempo");

-- CreateIndex
CREATE UNIQUE INDEX "dokumen_perusahaan_id_nomor_key" ON "dokumen"("perusahaan_id", "nomor");

-- CreateIndex
CREATE INDEX "idx_dokumen_item_dokumen" ON "dokumen_item"("dokumen_id");

-- CreateIndex
CREATE INDEX "idx_pembayaran_dokumen" ON "pembayaran"("dokumen_id");

-- CreateIndex
CREATE INDEX "idx_notifikasi_user" ON "notifikasi"("user_id", "is_read");

-- CreateIndex
CREATE INDEX "idx_audit_log_user" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_record" ON "audit_log"("tabel", "record_id");

-- AddForeignKey
ALTER TABLE "perusahaan" ADD CONSTRAINT "perusahaan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "klien" ADD CONSTRAINT "klien_perusahaan_id_fkey" FOREIGN KEY ("perusahaan_id") REFERENCES "perusahaan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_perusahaan_id_fkey" FOREIGN KEY ("perusahaan_id") REFERENCES "perusahaan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_klien_id_fkey" FOREIGN KEY ("klien_id") REFERENCES "klien"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen" ADD CONSTRAINT "dokumen_dibuat_oleh_fkey" FOREIGN KEY ("dibuat_oleh") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen_item" ADD CONSTRAINT "dokumen_item_dokumen_id_fkey" FOREIGN KEY ("dokumen_id") REFERENCES "dokumen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dokumen_lampiran" ADD CONSTRAINT "dokumen_lampiran_dokumen_id_fkey" FOREIGN KEY ("dokumen_id") REFERENCES "dokumen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_dokumen_id_fkey" FOREIGN KEY ("dokumen_id") REFERENCES "dokumen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran" ADD CONSTRAINT "pembayaran_dibuat_oleh_fkey" FOREIGN KEY ("dibuat_oleh") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_dokumen_id_fkey" FOREIGN KEY ("dokumen_id") REFERENCES "dokumen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_pdf" ADD CONSTRAINT "template_pdf_perusahaan_id_fkey" FOREIGN KEY ("perusahaan_id") REFERENCES "perusahaan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
