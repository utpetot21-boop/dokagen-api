import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './laporan.controller';

const router = Router();
router.use(authenticate);

router.get('/ringkasan',         ctrl.ringkasan);
router.get('/pendapatan-chart',  ctrl.pendapatanChart);
router.get('/dokumen-stats',     ctrl.dokumenStats);
router.get('/klien-terbaik',     ctrl.klienTerbaik);
router.get('/export-csv',        ctrl.exportCsv);

export default router;
