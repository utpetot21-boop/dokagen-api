import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './scan.controller';

const router = Router();
router.use(authenticate);

// Multer: simpan di memori (buffer), maks 20MB per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Hanya file PDF yang diizinkan'));
    }
  },
});

router.post('/simpan',       upload.single('pdf'), ctrl.simpan);
router.get('/',              ctrl.list);
router.get('/:id',           ctrl.detail);
router.delete('/:id',        ctrl.hapus);
router.post('/:id/lampirkan', ctrl.lampirkan);

export default router;
