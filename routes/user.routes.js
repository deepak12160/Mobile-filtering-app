const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const {
  validate,
  profileUpdateRules,
  mobileIdParamRules,
} = require('../middlewares/validation.middleware');

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

module.exports = router;
