const router = require('express').Router();
const ctrl = require('../controllers/mobile.controller');
const { filterRules, compareRules, validate } = require('../middlewares/validation.middleware');

// GET /api/mobiles/options  — available brands, os, panel types etc.
router.get('/options', ctrl.filterOptions);

// GET /api/mobiles/compare?ids=1,2,3
router.get('/compare', compareRules, validate, ctrl.compare);

// GET /api/mobiles?brand=Samsung&min_ram=8&min_camera_mp=50&sort_by=price_inr
router.get('/', filterRules, validate, ctrl.filter);

// GET /api/mobiles/:id
router.get('/:id', ctrl.getById);

module.exports = router;
