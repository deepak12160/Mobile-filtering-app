import * as userService from '../services/user.service.js';

const getProfile = async (req, res, next) => {
  try {
    const profile = await userService.getProfile(req.user.id);
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
};

const updateProfile = async (req, res, next) => {
  try {
    const updated = await userService.updateProfile(req.user.id, req.body);
    res.json({ success: true, message: 'Profile updated', data: updated });
  } catch (err) { next(err); }
};

const getWishlist = async (req, res, next) => {
  try {
    const items = await userService.getWishlist(req.user.id);
    res.json({ success: true, count: items.length, data: items });
  } catch (err) { next(err); }
};

const addToWishlist = async (req, res, next) => {
  try {
    const mobileId = req.params.mobileId;
    const result = await userService.addToWishlist(req.user.id, mobileId);
    res.status(result.added ? 201 : 200).json({ success: true, data: result });
  } catch (err) { next(err); }
};

const removeFromWishlist = async (req, res, next) => {
  try {
    const mobileId = req.params.mobileId;
    const result = await userService.removeFromWishlist(req.user.id, mobileId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export { getProfile, updateProfile, getWishlist, addToWishlist, removeFromWishlist };
