import { Router } from 'express';
import * as ctrl from '../controllers/mobile.controller.js';
import {
  filterRules,
  compareRules,
  mobileLookupParamRules,
  validate,
} from '../middlewares/validation.middleware.js';

const router = Router();

// GET /api/mobiles/options  — available brands, os, panel types etc.
router.get('/options', ctrl.filterOptions);

// GET /api/mobiles/compare?ids=1,2,3
router.get('/compare', compareRules, validate, ctrl.compare);

// GET /api/mobiles?brand=Samsung&min_ram=8&min_camera_mp=50&sort_by=price_inr
router.get('/', filterRules, validate, ctrl.filter);

// GET /api/mobiles/:id
router.get('/:id', mobileLookupParamRules, validate, ctrl.getById);

export default router;
