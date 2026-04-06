import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { UpdatePerusahaanSchema } from './perusahaan.schema';
import * as ctrl from './perusahaan.controller';

const router = Router();

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), 'uploads', 'images');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
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
