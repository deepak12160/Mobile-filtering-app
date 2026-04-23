import { pool } from '../config/database.js';

const getProfile = async (userId) => {
  const [rows] = await pool.query(
    'SELECT id, name, email, created_at FROM users WHERE id = ?',
    [userId]
  );

  return rows[0] || null;
};

const updateProfile = async (userId, { name }) => {
  await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
  return getProfile(userId);
};

const getWishlist = async (userId) => {
  const [rows] = await pool.query(
    `SELECT 
       MAX(uw.id) AS wishlist_id,
       p.id,
       b.name AS brand,
       p.model,
       pv.price AS price_inr,
       pl.os,
       rear.megapixels AS rear_main_mp,
       pv.ram AS ram_gb,
       pv.storage AS internal_gb,
       p.battery_capacity AS capacity_mah
     FROM user_wishlist uw
     JOIN phones p ON p.id = uw.phone_id
     JOIN brands b ON b.id = p.brand_id
     LEFT JOIN phone_variants pv ON pv.phone_id = p.id
     LEFT JOIN platforms pl ON pl.id = p.platform_id
     LEFT JOIN phone_cameras rear
       ON rear.phone_id = p.id
      AND rear.placement = 'rear'
      AND rear.lens_type = 'primary'
     WHERE uw.user_id = ?
     GROUP BY p.id, b.name, p.model, pl.os, p.battery_capacity
     ORDER BY wishlist_id DESC`,
    [userId]
  );

  return rows;
};

const addToWishlist = async (userId, phoneId) => {
  const [phoneRes, existingRes] = await Promise.all([
    pool.query('SELECT id FROM phones WHERE id = ?', [phoneId]),
    pool.query('SELECT id FROM user_wishlist WHERE user_id = ? AND phone_id = ?', [userId, phoneId]),
  ]);

  const phoneRows = phoneRes[0];
  const existingRows = existingRes[0];

  if (!phoneRows.length) {
    const err = new Error('Phone not found');
    err.statusCode = 404;
    throw err;
  }

  if (existingRows.length) {
    return { added: false, message: 'Already in wishlist', phoneId };
  }

  await pool.query('INSERT INTO user_wishlist (user_id, phone_id) VALUES (?, ?)', [userId, phoneId]);
  return { added: true, phoneId };
};

const removeFromWishlist = async (userId, phoneId) => {
  const [result] = await pool.query(
    'DELETE FROM user_wishlist WHERE user_id = ? AND phone_id = ?',
    [userId, phoneId]
  );

  return { removed: result.affectedRows > 0 };
};

export { getProfile, updateProfile, getWishlist, addToWishlist, removeFromWishlist };
