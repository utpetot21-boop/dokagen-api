import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { errorHandler } from './middleware/errorHandler.middleware';
import authRoutes from './modules/auth/auth.routes';
import perusahaanRoutes from './modules/perusahaan/perusahaan.routes';
import klienRoutes from './modules/klien/klien.routes';
import dokumenRoutes from './modules/dokumen/dokumen.routes';
import laporanRoutes from './modules/laporan/laporan.routes';
import notifikasiRoutes from './modules/notifikasi/notifikasi.routes';
import scanRoutes from './modules/scan/scan.routes';

const app = express();

// ─── Security & Middleware ──────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan, coba lagi nanti.' },
});
app.use('/api', limiter);

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/perusahaan', perusahaanRoutes);
app.use('/api/klien', klienRoutes);
app.use('/api/dokumen', dokumenRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/notifikasi', notifikasiRoutes);
app.use('/api/scan', scanRoutes);

// File statis: PDF hasil scan bisa diakses via /uploads/scan/...
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'dokagen-api' });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan.' });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
