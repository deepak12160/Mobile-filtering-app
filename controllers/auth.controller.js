const authService = require('../services/auth.service');

const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.signup({ name, email, password });
    res.status(201).json({ success: true, message: 'Account created', data: result });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json({ success: true, message: 'Login successful', data: result });
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ success: false, message: 'Refresh token required' });
    const tokens = await authService.refreshAccessToken(refreshToken);
    res.json({ success: true, data: tokens });
  } catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(req.user.id, refreshToken);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
};

const me = (req, res) => {
  res.json({ success: true, data: req.user });
};

module.exports = { signup, login, refresh, logout, me };
