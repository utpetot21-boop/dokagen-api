/**
 * FCM Service — kirim push notification via firebase-admin
 *
 * Fitur:
 * - sendToUser(): kirim ke semua token aktif milik 1 user
 * - sendBatch(): batch send maks 500 token (batas FCM)
 * - Otomatis hapus token yang invalid/expired
 * - Retry maks 3x dengan exponential backoff (1s, 2s, 4s)
 */

import * as admin from 'firebase-admin';
import prisma from '../../lib/prisma';

// Inisialisasi firebase-admin sekali saja (singleton)
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
  } else {
    // Fallback: baca dari file (untuk development)
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (serviceAccountPath) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
    } else {
      console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT_JSON tidak ditemukan — push notif dinonaktifkan');
    }
  }
}

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

// ── Kirim ke semua token aktif milik 1 user ────────────────────────────────

export async function sendToUser(userId: string, payload: FcmPayload): Promise<void> {
  if (!admin.apps.length) return; // Firebase tidak terkonfigurasi

  const tokens = await prisma.fcmToken.findMany({
    where: { userId, isActive: true },
    select: { id: true, token: true },
  });

  if (tokens.length === 0) return;

  const tokenStrings = tokens.map((t) => t.token);
  const invalidTokenIds = await sendBatch(tokenStrings, payload);

  // Nonaktifkan token yang invalid
  if (invalidTokenIds.length > 0) {
    await prisma.fcmToken.updateMany({
      where: {
        userId,
        token: { in: invalidTokenIds },
      },
      data: { isActive: false },
    });
  }
}

// ── Batch send (maks 500 token per request) ────────────────────────────────

export async function sendBatch(
  tokens: string[],
  payload: FcmPayload,
  retryCount = 0,
): Promise<string[]> {
  if (!admin.apps.length || tokens.length === 0) return [];

  const invalidTokens: string[] = [];
  const BATCH_SIZE = 500;

  // Potong menjadi batch 500
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    const message: admin.messaging.MulticastMessage = {
      tokens: batch,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data ?? {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: _resolveChannel(payload.data?.action),
        },
      },
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);

      // Kumpulkan token yang gagal
      response.responses.forEach((r, idx) => {
        if (!r.success && r.error) {
          const code = r.error.code;
          // Token tidak valid / tidak terdaftar → hapus
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(batch[idx]);
          }
        }
      });
    } catch (err) {
      console.error('[FCM] Batch send error:', err);

      // Retry dengan exponential backoff
      if (retryCount < 3) {
        const delayMs = Math.pow(2, retryCount) * 1000;
        await new Promise((r) => setTimeout(r, delayMs));
        const retryInvalid = await sendBatch(batch, payload, retryCount + 1);
        invalidTokens.push(...retryInvalid);
      }
    }
  }

  return invalidTokens;
}

// ── Register / update token ────────────────────────────────────────────────

export async function registerToken(
  userId: string,
  token: string,
  deviceInfo?: string,
): Promise<void> {
  await prisma.fcmToken.upsert({
    where: { token },
    create: { userId, token, deviceInfo, isActive: true },
    update: { userId, isActive: true, lastUsedAt: new Date(), deviceInfo },
  });
}

// ── Hapus token (saat logout) ──────────────────────────────────────────────

export async function deleteToken(token: string): Promise<void> {
  await prisma.fcmToken.updateMany({
    where: { token },
    data: { isActive: false },
  });
}

// ── Helper: tentukan channel Android berdasarkan aksi ─────────────────────

function _resolveChannel(action?: string): string {
  if (!action) return 'dokagen_info';
  if (action === 'BUKA_DOKUMEN') return 'dokagen_jatuh_tempo';
  return 'dokagen_info';
}
