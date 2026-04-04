import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
  CreateDokumenSchema, UpdateDokumenSchema,
  UpdateStatusSchema, PembayaranSchema,
} from './dokumen.schema';
import * as ctrl from './dokumen.controller';

const router = Router();
router.use(authenticate);

router.get('/',                      ctrl.list);
router.post('/',                     validate(CreateDokumenSchema), ctrl.create);
router.get('/:id',                   ctrl.getById);
router.put('/:id',                   validate(UpdateDokumenSchema), ctrl.update);
router.delete('/:id',                ctrl.remove);
router.post('/:id/status',           validate(UpdateStatusSchema), ctrl.updateStatus);
router.get('/:id/pdf',               ctrl.getPdf);
router.post('/:id/pembayaran',       validate(PembayaranSchema), ctrl.addPembayaran);
router.get('/:id/pembayaran',        ctrl.getPembayaran);
router.post('/:id/kirim',            ctrl.kirimDokumen);

export default router;
