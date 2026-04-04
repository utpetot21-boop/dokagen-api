-- AlterEnum
ALTER TYPE "TipeNotifikasi" ADD VALUE 'dokumen_baru';

-- CreateTable
CREATE TABLE "fcm_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "device_info" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fcm_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifikasi_setting" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "push_aktif" BOOLEAN NOT NULL DEFAULT true,
    "email_aktif" BOOLEAN NOT NULL DEFAULT false,
    "inapp_aktif" BOOLEAN NOT NULL DEFAULT true,
    "pengingat_h7" BOOLEAN NOT NULL DEFAULT true,
    "pengingat_h3" BOOLEAN NOT NULL DEFAULT true,
    "pengingat_h1" BOOLEAN NOT NULL DEFAULT true,
    "pengingat_h0" BOOLEAN NOT NULL DEFAULT true,
    "notif_dokumen_terkirim" BOOLEAN NOT NULL DEFAULT true,
    "notif_pembayaran" BOOLEAN NOT NULL DEFAULT true,
    "notif_dokumen_baru" BOOLEAN NOT NULL DEFAULT true,
    "jam_pengiriman" VARCHAR(5) NOT NULL DEFAULT '08:00',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fcm_tokens_token_key" ON "fcm_tokens"("token");

-- CreateIndex
CREATE INDEX "idx_fcm_user" ON "fcm_tokens"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "notifikasi_setting_user_id_key" ON "notifikasi_setting"("user_id");

-- AddForeignKey
ALTER TABLE "fcm_tokens" ADD CONSTRAINT "fcm_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi_setting" ADD CONSTRAINT "notifikasi_setting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
