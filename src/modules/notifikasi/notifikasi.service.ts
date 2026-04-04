/**
 * Notifikasi Service — CRUD notifikasi, FCM token, dan setting
 */

import prisma from '../../lib/prisma';
import { Prisma, TipeNotifikasi } from '@prisma/client';
import { registerToken, deleteToken } from './fcm.service';

// ── Tipe filter ────────────────────────────────────────────────────────────

type FilterTipe = 'semua' | 'belum_dibaca' | 'jatuh_tempo' | 'pembayaran';

// ── List notifikasi ────────────────────────────────────────────────────────

export async function list(
  userId: string,
  filter: FilterTipe = 'semua',
  page = 1,
  limit = 30,
) {
  const where: Prisma.NotifikasiWhereInput = { userId };

  switch (filter) {
    case 'belum_dibaca':
      where.isRead = false;
      break;
    case 'jatuh_tempo':
      where.tipe = 'jatuh_tempo';
      break;
    case 'pembayaran':
      where.tipe = 'pembayaran_diterima';
      break;
  }

  const [items, total] = await Promise.all([
    prisma.notifikasi.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        dokumen: {
          select: { nomor: true, tipe: true, klienNama: true, total: true },
        },
      },
    }),
    prisma.notifikasi.count({ where }),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ── Unread count ───────────────────────────────────────────────────────────

export async function getUnreadCount(userId: string) {
  return prisma.notifikasi.count({ where: { userId, isRead: false } });
}

// ── Tandai dibaca ──────────────────────────────────────────────────────────

export async function markRead(id: string, userId: string) {
  return prisma.notifikasi.updateMany({
    where: { id, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  return prisma.notifikasi.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

// ── Hapus ──────────────────────────────────────────────────────────────────

export async function hapusSatu(id: string, userId: string) {
  return prisma.notifikasi.deleteMany({ where: { id, userId } });
}

export async function hapusSemua(userId: string) {
  return prisma.notifikasi.deleteMany({
    where: { userId, isRead: true },
  });
}

// ── Buat notifikasi (internal, dipanggil cron / event) ────────────────────

export async function create(
  userId: string,
  tipe: TipeNotifikasi,
  judul: string,
  pesan: string,
  dokumenId?: string,
) {
  return prisma.notifikasi.create({
    data: { userId, tipe, judul, pesan, dokumenId, sentAt: new Date() },
  });
}

// ── FCM Token ──────────────────────────────────────────────────────────────

export async function daftarFcmToken(
  userId: string,
  token: string,
  deviceInfo?: string,
) {
  await registerToken(userId, token, deviceInfo);
}

export async function hapusFcmToken(token: string) {
  await deleteToken(token);
}

// ── Setting notifikasi ─────────────────────────────────────────────────────

export async function getSetting(userId: string) {
  // Buat default setting jika belum ada
  return prisma.notifikasiSetting.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function updateSetting(
  userId: string,
  data: Partial<{
    pushAktif: boolean;
    emailAktif: boolean;
    inappAktif: boolean;
    pengingatH7: boolean;
    pengingatH3: boolean;
    pengingatH1: boolean;
    pengingatH0: boolean;
    notifDokumenTerkirim: boolean;
    notifPembayaran: boolean;
    notifDokumenBaru: boolean;
    jamPengiriman: string;
  }>,
) {
  return prisma.notifikasiSetting.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}
