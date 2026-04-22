import { Router } from 'express';
import * as ctrl from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import {
  validate,
  profileUpdateRules,
  mobileIdParamRules,
} from '../middlewares/validation.middleware.js';

const router = Router();

// All user routes are protected
router.use(authenticate);

// GET  /api/users/profile
router.get('/profile', ctrl.getProfile);

// PATCH /api/users/profile
router.patch('/profile',
  profileUpdateRules,
  validate,
  ctrl.updateProfile
);

// GET  /api/users/wishlist
router.get('/wishlist', ctrl.getWishlist);

// POST /api/users/wishlist/:mobileId
router.post('/wishlist/:mobileId', mobileIdParamRules, validate, ctrl.addToWishlist);

// DELETE /api/users/wishlist/:mobileId
router.delete('/wishlist/:mobileId', mobileIdParamRules, validate, ctrl.removeFromWishlist);

export default router;
