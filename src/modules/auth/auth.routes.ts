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

// Registrasi publik dinonaktifkan — akun dibuat dari Settings oleh owner/admin
// router.post('/register', validate(RegisterSchema), authController.register);
router.post('/login', validate(LoginSchema), authController.login);
router.post('/refresh', validate(RefreshTokenSchema), authController.refresh);
router.post('/logout', authController.logout);
router.put('/password', authenticate, authController.changePassword);

export default router;
