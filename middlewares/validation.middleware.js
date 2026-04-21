const { body, query, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

const signupRules = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

const profileUpdateRules = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be 2-100 characters'),
];

const filterRules = [
  query('brand').optional().isString().trim(),
  query('os').optional().isString().trim(),
  query('min_price').optional().isFloat({ min: 0 }).toFloat(),
  query('max_price').optional().isFloat({ min: 0 }).toFloat(),
  query('min_ram').optional().isInt({ min: 1 }).toInt(),
  query('max_ram').optional().isInt().toInt(),
  query('min_storage').optional().isInt({ min: 1 }).toInt(),
  query('min_camera_mp').optional().isFloat({ min: 0 }).toFloat(),
  query('min_battery_mah').optional().isInt({ min: 0 }).toInt(),
  query('min_display_size').optional().isFloat({ min: 0 }).toFloat(),
  query('max_display_size').optional().isFloat().toFloat(),
  query('min_refresh_rate').optional().isInt({ min: 60 }).toInt(),
  query('panel_type').optional().isString().trim(),
  query('processor_brand').optional().isString().trim(),
  query('ois').optional().isIn(['0', '1', 'true', 'false']),
  query('fast_charge').optional().isInt({ min: 0 }).toInt(),
  query('sort_by').optional().isIn(['price_inr', 'rear_main_mp', 'ram_gb', 'capacity_mah', 'refresh_rate_hz']),
  query('sort_order').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
];

const compareRules = [
  query('ids')
    .notEmpty().withMessage('ids query param required')
    .custom((val) => {
      const ids = val.split(',').map(Number);
      if (ids.length < 2) throw new Error('Provide at least 2 mobile IDs');
      if (ids.length > 4) throw new Error('Compare at most 4 mobiles at once');
      if (ids.some(isNaN)) throw new Error('All IDs must be numbers');
      return true;
    }),
];

const mobileIdParamRules = [
  param('mobileId')
    .isInt({ min: 1 })
    .withMessage('Valid mobile ID required')
    .toInt(),
];

module.exports = {
  validate,
  signupRules,
  loginRules,
  profileUpdateRules,
  filterRules,
  compareRules,
  mobileIdParamRules,
};
