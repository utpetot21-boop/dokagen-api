import { Router } from 'express';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import {
  RegisterSchema,
  LoginSchema,
  RefreshTokenSchema,
} from './auth.schema';
import * as authController from './auth.controller';

const router = Router();

router.post('/register', validate(RegisterSchema), authController.register);
router.post('/login', validate(LoginSchema), authController.login);
router.post('/refresh', validate(RefreshTokenSchema), authController.refresh);
router.post('/logout', authController.logout);
router.put('/password', authenticate, authController.changePassword);

export default router;
