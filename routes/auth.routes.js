const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { signupRules, loginRules, validate } = require('../middlewares/validation.middleware');

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

module.exports = router;
