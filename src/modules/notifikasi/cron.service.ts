/**
 * Cron Service — pengingat jatuh tempo harian
 *
 * Jadwal: setiap hari jam 08.00 WIB (= 01:00 UTC)
 * Logika:
 *   H-7 / H-3 / H-1 / H+0 → buat notifikasi + kirim push FCM
 *   H+1                    → ubah status dokumen → 'jatuh_tempo' + audit_log
 *
 * Untuk mencegah duplikat: cek apakah notif H yang sama sudah dikirim hari ini.
 */

import cron from 'node-cron';
import prisma from '../../lib/prisma';
import { sendToUser, FcmPayload } from './fcm.service';

// ── Template pesan per hari ────────────────────────────────────────────────

interface PushTemplate {
  judul: string;
  pesan: (nomor: string, klien: string, total: string) => string;
  fcmTitle: string;
  fcmBody: (nomor: string, klien: string, total: string) => string;
}

const TEMPLATES: Record<number, PushTemplate> = {
  [-7]: {
    judul: 'Mendekati Jatuh Tempo',
    pesan: (n, k, t) => `Invoice ${n} untuk ${k} sebesar ${t} akan jatuh tempo dalam 7 hari.`,
    fcmTitle: '📅 Jatuh tempo dalam 7 hari',
    fcmBody: (n, k, t) => `${n} · ${k} · ${t}`,
  },
  [-3]: {
    judul: 'Segera Jatuh Tempo',
    pesan: (n, k, t) => `Invoice ${n} untuk ${k} sebesar ${t} akan jatuh tempo dalam 3 hari.`,
    fcmTitle: '⚠️ Jatuh tempo dalam 3 hari',
    fcmBody: (n, k, t) => `${n} · ${k} · ${t}`,
  },
  [-1]: {
    judul: 'Besok Jatuh Tempo!',
    pesan: (n, k, t) => `Invoice ${n} untuk ${k} sebesar ${t} jatuh tempo BESOK.`,
    fcmTitle: '🔔 Besok jatuh tempo!',
    fcmBody: (n, k, t) => `${n} · ${k} · ${t}`,
  },
  [0]: {
    judul: 'Hari Ini Jatuh Tempo!',
    pesan: (n, k, t) => `Invoice ${n} untuk ${k} sebesar ${t} jatuh tempo HARI INI. Segera tindak lanjut.`,
    fcmTitle: '🚨 Hari ini jatuh tempo!',
    fcmBody: (n, k, _t) => `${n} · ${k} · Segera tindak lanjut`,
  },
};

// ── Setting field per H-hari ───────────────────────────────────────────────

const SETTING_FIELD: Record<number, keyof {
  pengingatH7: boolean; pengingatH3: boolean;
  pengingatH1: boolean; pengingatH0: boolean;
}> = {
  [-7]: 'pengingatH7',
  [-3]: 'pengingatH3',
  [-1]: 'pengingatH1',
  [0]:  'pengingatH0',
};

// ── Format Rupiah sederhana ────────────────────────────────────────────────

function formatRp(value: unknown): string {
  const num = typeof value === 'object' && value !== null
    ? parseFloat(String(value))
    : Number(value);
  return 'Rp ' + num.toLocaleString('id-ID');
}

// ── Cek sudah dikirim hari ini (cegah duplikat) ────────────────────────────

async function sudahDikirimHariIni(
  userId: string,
  dokumenId: string,
  hHari: number,
): Promise<boolean> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await (prisma as any).notifikasi.findFirst({
    where: {
      userId,
      dokumenId,
      tipe: 'jatuh_tempo',
      // Gunakan kolom h_hari jika sudah migrasi — fallback cek createdAt
      createdAt: { gte: today },
    },
  });
  return !!existing;
}

// ── Ambil userId owner perusahaan ─────────────────────────────────────────

async function getOwnerUserId(perusahaanId: string): Promise<string | null> {
  const perusahaan = await prisma.perusahaan.findFirst({
    where: { id: perusahaanId },
    select: { userId: true },
  });
  return perusahaan?.userId ?? null;
}

// ── Ambil setting notifikasi user ─────────────────────────────────────────

async function getSetting(userId: string) {
  return prisma.notifikasiSetting.findUnique({ where: { userId } });
}

// ── Proses satu hari (H-7, H-3, H-1, H+0) ────────────────────────────────

async function prosesHari(hHari: number): Promise<number> {
  const template = TEMPLATES[hHari];
  if (!template) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Hitung tanggal target: today + (-hHari) hari
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() + (-hHari));
  const targetEnd = new Date(targetDate);
  targetEnd.setHours(23, 59, 59, 999);

  const dokumenList = await prisma.dokumen.findMany({
    where: {
      status: { in: ['terkirim', 'aktif'] },
      tanggalJatuhTempo: { gte: targetDate, lte: targetEnd },
    },
    select: {
      id: true,
      nomor: true,
      klienNama: true,
      total: true,
      perusahaanId: true,
      tipe: true,
    },
  });

  let terkirim = 0;

  for (const doc of dokumenList) {
    const userId = await getOwnerUserId(doc.perusahaanId);
    if (!userId) continue;

    // Cegah duplikat
    if (await sudahDikirimHariIni(userId, doc.id, hHari)) continue;

    // Cek setting user
    const setting = await getSetting(userId);
    const settingField = SETTING_FIELD[hHari];
    if (setting && settingField && !setting[settingField]) continue;

    const klien = doc.klienNama ?? 'Klien';
    const total = formatRp(doc.total);

    // Buat record notifikasi
    await prisma.notifikasi.create({
      data: {
        userId,
        dokumenId: doc.id,
        tipe: 'jatuh_tempo',
        judul: template.judul,
        pesan: template.pesan(doc.nomor, klien, total),
        sentAt: new Date(),
      },
    });

    // Kirim push FCM (jika push aktif di setting)
    const pushAktif = setting ? setting.pushAktif : true;
    if (pushAktif) {
      const fcmPayload: FcmPayload = {
        title: template.fcmTitle,
        body: template.fcmBody(doc.nomor, klien, total),
        data: {
          dokumen_id:   doc.id,
          tipe_dokumen: doc.tipe,
          nomor:        doc.nomor,
          action:       'BUKA_DOKUMEN',
          h_hari:       String(hHari),
        },
      };
      await sendToUser(userId, fcmPayload).catch((err) => {
        console.error(`[Cron] FCM error untuk user ${userId}:`, err);
      });
    }

    terkirim++;
  }

  return terkirim;
}

// ── Proses H+1 — auto update status jatuh_tempo ───────────────────────────

async function prosesOverdue(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Dokumen yang jatuh tempo kemarin atau sebelumnya, masih status aktif/terkirim
  const overdueList = await prisma.dokumen.findMany({
    where: {
      status: { in: ['terkirim', 'aktif'] },
      tanggalJatuhTempo: { lt: today },
    },
    select: {
      id: true,
      nomor: true,
      klienNama: true,
      total: true,
      perusahaanId: true,
      tipe: true,
    },
  });

  if (overdueList.length === 0) return 0;

  // Batch update status → jatuh_tempo
  const ids = overdueList.map((d) => d.id);
  await prisma.dokumen.updateMany({
    where: { id: { in: ids } },
    data: { status: 'jatuh_tempo' },
  });

  // Audit log per dokumen
  for (const doc of overdueList) {
    await prisma.auditLog.create({
      data: {
        aksi: 'AUTO_UPDATE_STATUS_JATUH_TEMPO',
        tabel: 'dokumen',
        recordId: doc.id,
        dataBaru: { status: 'jatuh_tempo' },
        dataLama: { status: 'terkirim' },
      },
    });

    // Notifikasi in-app untuk owner (tanpa push, hanya record)
    const userId = await getOwnerUserId(doc.perusahaanId);
    if (userId) {
      await prisma.notifikasi.create({
        data: {
          userId,
          dokumenId: doc.id,
          tipe: 'jatuh_tempo',
          judul: 'Dokumen Telah Jatuh Tempo',
          pesan: `${doc.nomor} untuk ${doc.klienNama ?? 'klien'} telah melewati tanggal jatuh tempo dan statusnya diperbarui otomatis.`,
          sentAt: new Date(),
        },
      });
    }
  }

  return overdueList.length;
}

// ── Main runner (bisa dipanggil manual dari endpoint internal) ─────────────

export async function jalankanCronJatuhTempo(): Promise<{
  h7: number; h3: number; h1: number; h0: number; overdue: number;
}> {
  console.log('[Cron] Memulai pengecekan jatuh tempo...');

  const [h7, h3, h1, h0, overdue] = await Promise.all([
    prosesHari(-7),
    prosesHari(-3),
    prosesHari(-1),
    prosesHari(0),
    prosesOverdue(),
  ]);

  console.log(`[Cron] Selesai — H-7: ${h7}, H-3: ${h3}, H-1: ${h1}, H+0: ${h0}, Overdue update: ${overdue}`);
  return { h7, h3, h1, h0, overdue };
}

// ── Daftarkan jadwal cron ──────────────────────────────────────────────────

export function initCronJobs(): void {
  // Setiap hari jam 08.00 WIB (Asia/Jakarta = UTC+7 → 01:00 UTC)
  cron.schedule('0 1 * * *', async () => {
    await jalankanCronJatuhTempo().catch((err) => {
      console.error('[Cron] Error:', err);
    });
  }, {
    timezone: 'Asia/Jakarta',
  });

  console.log('[Cron] Job jatuh tempo terdaftar — jam 08.00 WIB setiap hari');
}
