const { pool } = require('../config/database');

const getProfile = async (userId) => {
  const [rows] = await pool.execute(
    'SELECT id, uuid, name, email, created_at FROM users WHERE id = ?',
    [userId]
  );

  return rows[0] || null;
};

const updateProfile = async (userId, { name }) => {
  await pool.execute('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
  return getProfile(userId);
};

const getWishlist = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT
       m.id, m.brand, m.model, m.price_inr, m.os, m.image_url,
       c.rear_main_mp, r.ram_gb, s.internal_gb, b.capacity_mah,
       uw.added_at
     FROM user_wishlist uw
     JOIN mobiles m ON m.id = uw.mobile_id
     LEFT JOIN cameras c ON c.mobile_id = m.id
     LEFT JOIN ram r ON r.mobile_id = m.id
     LEFT JOIN storage s ON s.mobile_id = m.id
     LEFT JOIN battery b ON b.mobile_id = m.id
     WHERE uw.user_id = ?
     ORDER BY uw.added_at DESC`,
    [userId]
  );

  return rows;
};

const addToWishlist = async (userId, mobileId) => {
  try {
    await pool.execute(
      'INSERT INTO user_wishlist (user_id, mobile_id) VALUES (?, ?)',
      [userId, mobileId]
    );
    return { added: true, mobileId };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return { added: false, message: 'Already in wishlist' };
    }

    throw err;
  }
};

const removeFromWishlist = async (userId, mobileId) => {
  const [result] = await pool.execute(
    'DELETE FROM user_wishlist WHERE user_id = ? AND mobile_id = ?',
    [userId, mobileId]
  );

  return { removed: result.affectedRows > 0 };
};

module.exports = { getProfile, updateProfile, getWishlist, addToWishlist, removeFromWishlist };
