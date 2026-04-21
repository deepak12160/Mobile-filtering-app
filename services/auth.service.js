const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

const signup = async ({ name, email, password }) => {
  const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) {
    const err = new Error('Email already registered');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const uuid = uuidv4();

  const [result] = await pool.execute(
    'INSERT INTO users (uuid, name, email, password_hash) VALUES (?, ?, ?, ?)',
    [uuid, name, email, passwordHash]
  );

  const userId = result.insertId;
  const { accessToken, refreshToken } = generateTokens(userId);
  const refreshHash = await bcrypt.hash(refreshToken, 8);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await pool.execute(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, refreshHash, expiresAt]
  );

  return {
    user: { id: userId, uuid, name, email },
    accessToken,
    refreshToken,
  };
};

const login = async ({ email, password }) => {
  const [rows] = await pool.execute(
    'SELECT id, uuid, name, email, password_hash FROM users WHERE email = ?',
    [email]
  );

  if (!rows.length) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const user = rows[0];
  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const err = new Error('Invalid email or password');
    err.statusCode = 401;
    throw err;
  }

  const { accessToken, refreshToken } = generateTokens(user.id);
  const refreshHash = await bcrypt.hash(refreshToken, 8);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await pool.execute(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [user.id, refreshHash, expiresAt]
  );

  return {
    user: { id: user.id, uuid: user.uuid, name: user.name, email: user.email },
    accessToken,
    refreshToken,
  };
};

const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    const err = new Error('Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  const [tokens] = await pool.execute(
    'SELECT id, token_hash FROM refresh_tokens WHERE user_id = ? AND expires_at > NOW()',
    [decoded.id]
  );

  let validToken = null;
  for (const token of tokens) {
    if (await bcrypt.compare(refreshToken, token.token_hash)) {
      validToken = token;
      break;
    }
  }

  if (!validToken) {
    const err = new Error('Refresh token not recognised');
    err.statusCode = 401;
    throw err;
  }

  await pool.execute('DELETE FROM refresh_tokens WHERE id = ?', [validToken.id]);

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id);
  const newHash = await bcrypt.hash(newRefreshToken, 8);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await pool.execute(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [decoded.id, newHash, expiresAt]
  );

  return { accessToken, refreshToken: newRefreshToken };
};

const logout = async (userId, refreshToken) => {
  if (!refreshToken) return;

  const [tokens] = await pool.execute(
    'SELECT id, token_hash FROM refresh_tokens WHERE user_id = ?',
    [userId]
  );

  for (const token of tokens) {
    if (await bcrypt.compare(refreshToken, token.token_hash)) {
      await pool.execute('DELETE FROM refresh_tokens WHERE id = ?', [token.id]);
      break;
    }
  }
};

module.exports = { signup, login, refreshAccessToken, logout };
