import { Router } from 'express';
import * as ctrl from '../controllers/storefront.controller.js';
import {
  validate,
  mobileLookupParamRules,
} from '../middlewares/validation.middleware.js';

const router = Router();

router.get('/home', ctrl.home);
router.get('/products/:id', mobileLookupParamRules, validate, ctrl.product);

export default router;
