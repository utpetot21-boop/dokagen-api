import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import * as usersController from './users.controller';

const router = Router();

// Semua endpoint butuh login dan minimal role admin
router.use(authenticate, requireRole('owner', 'admin'));

router.get('/', usersController.list);
router.post('/', requireRole('owner', 'admin'), usersController.create);
router.put('/:id', requireRole('owner', 'admin'), usersController.update);
router.delete('/:id', requireRole('owner'), usersController.remove);

export default router;
