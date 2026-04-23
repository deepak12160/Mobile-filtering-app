import * as mobileService from '../services/mobile.service.js';
import { paginated } from '../utils/response.js';

const filter = async (req, res, next) => {
  try {
    const result = await mobileService.filterMobiles(req.query);
    return paginated(res, result.data, result.pagination, 'Mobiles fetched');
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const mobile = await mobileService.getMobileById(req.params.id);
    if (!mobile) return res.status(404).json({ success: false, message: 'Mobile not found' });
    res.json({ success: true, data: mobile });
  } catch (err) { next(err); }
};

const compare = async (req, res, next) => {
  try {
    const ids = req.query.ids.split(',').map(Number);
    const result = await mobileService.compareMobiles(ids);
    if (!result.mobiles.length) {
      return res.status(404).json({ success: false, message: 'No mobiles found for given IDs' });
    }
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

const filterOptions = async (req, res, next) => {
  try {
    const options = await mobileService.getFilterOptions();
    res.json({ success: true, data: options });
  } catch (err) { next(err); }
};

export { filter, getById, compare, filterOptions };
