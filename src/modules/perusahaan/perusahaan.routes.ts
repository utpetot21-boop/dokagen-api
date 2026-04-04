import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { UpdatePerusahaanSchema } from './perusahaan.schema';
import * as ctrl from './perusahaan.controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan'));
  },
});

router.use(authenticate);

// GET  /api/perusahaan/me
router.get('/me', ctrl.getMe);

// PUT  /api/perusahaan/me
router.put('/me', validate(UpdatePerusahaanSchema), ctrl.updateMe);

// POST /api/perusahaan/logo
router.post('/logo', upload.single('logo'), ctrl.uploadLogo);

// POST /api/perusahaan/ttd
router.post('/ttd', upload.single('ttd'), ctrl.uploadTtd);

// POST /api/perusahaan/stempel
router.post('/stempel', upload.single('stempel'), ctrl.uploadStempel);

export default router;
