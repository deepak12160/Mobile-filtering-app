import * as storefrontService from '../services/storefront.service.js';

const home = async (req, res, next) => {
  try {
    const data = await storefrontService.getStorefrontHome();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const product = async (req, res, next) => {
  try {
    const data = await storefrontService.getStorefrontProduct(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export { home, product };
