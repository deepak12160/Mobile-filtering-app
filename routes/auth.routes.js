import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { signupRules, loginRules, validate } from '../middlewares/validation.middleware.js';

const router = Router();

// POST /api/auth/signup
router.post('/signup', signupRules, validate, ctrl.signup);

// POST /api/auth/login
router.post('/login', loginRules, validate, ctrl.login);

// POST /api/auth/refresh
router.post('/refresh', ctrl.refresh);

// POST /api/auth/logout     (authenticated)
router.post('/logout', authenticate, ctrl.logout);

// GET  /api/auth/me         (authenticated)
router.get('/me', authenticate, ctrl.me);

export default router;
