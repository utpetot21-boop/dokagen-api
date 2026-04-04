import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './notifikasi.controller';

const router = Router();
router.use(authenticate);

// ── Notifikasi ─────────────────────────────────────────────────────────────
router.get('/',                  ctrl.list);
router.get('/unread-count',      ctrl.unreadCount);
router.put('/baca-semua',        ctrl.markAllRead);
router.put('/:id/baca',          ctrl.markRead);
router.delete('/hapus-semua',    ctrl.hapusSemua);
router.delete('/:id',            ctrl.hapusSatu);

// ── FCM Token ──────────────────────────────────────────────────────────────
router.post('/fcm-token',        ctrl.daftarFcmToken);
router.delete('/fcm-token',      ctrl.hapusFcmToken);

// ── Setting ────────────────────────────────────────────────────────────────
router.get('/setting',           ctrl.getSetting);
router.put('/setting',           ctrl.updateSetting);

// ── Internal (cron manual) ────────────────────────────────────────────────
router.post('/internal/cron-jatuh-tempo', ctrl.triggerCron);

export default router;
