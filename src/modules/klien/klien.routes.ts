import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { KlienSchema, UpdateKlienSchema } from './klien.schema';
import * as ctrl from './klien.controller';

const router = Router();
router.use(authenticate);

router.get('/',            ctrl.list);
router.post('/',           validate(KlienSchema), ctrl.create);
router.get('/:id',         ctrl.getById);
router.put('/:id',         validate(UpdateKlienSchema), ctrl.update);
router.delete('/:id',      ctrl.remove);
router.get('/:id/dokumen', ctrl.getDokumen);

export default router;
