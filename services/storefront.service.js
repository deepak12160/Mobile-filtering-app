import { pool } from '../config/database.js';
import { getCache, setCache } from '../config/redis.js';

const PRODUCT_CARD_SELECT = `
  SELECT
    p.id,
    b.name AS brand,
    p.model,
    pv.price AS price_inr,
    pl.os,
    pr.name AS chip_name,
    pr.manufacturer AS processor_brand,
    dt.type AS panel_type,
    p.refresh_rate AS refresh_rate_hz,
    p.battery_capacity AS capacity_mah,
    p.spec_score,
    p.user_rating,
    rear.megapixels AS rear_main_mp,
    pv.ram AS ram_gb,
    pv.storage AS internal_gb
  FROM phones p
  JOIN brands b ON b.id = p.brand_id
  JOIN processors pr ON pr.id = p.processor_id
  LEFT JOIN platforms pl ON pl.id = p.platform_id
  LEFT JOIN display_tech dt ON dt.id = p.display_tech_id
  LEFT JOIN phone_variants pv ON pv.phone_id = p.id
  LEFT JOIN phone_cameras rear
    ON rear.phone_id = p.id
   AND rear.placement = 'rear'
   AND rear.lens_type = 'primary'
`;

const dedupeByPhone = (rows) => {
  const seen = new Set();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
};

const getHeroStats = async () => {
  const [rows] = await pool.execute(`
    SELECT
      COUNT(DISTINCT p.id) AS total_models,
      COUNT(DISTINCT b.id) AS total_brands,
      MIN(pv.price) AS min_price,
      MAX(pv.price) AS max_price
    FROM phones p
    JOIN brands b ON b.id = p.brand_id
    LEFT JOIN phone_variants pv ON pv.phone_id = p.id
  `);

  return rows[0];
};

const getBrandTiles = async () => {
  const [rows] = await pool.execute(`
    SELECT
      b.name AS brand,
      COUNT(DISTINCT p.id) AS total_models,
      MIN(pv.price) AS starting_price
    FROM brands b
    JOIN phones p ON p.brand_id = b.id
    LEFT JOIN phone_variants pv ON pv.phone_id = p.id
    GROUP BY b.id, b.name
    ORDER BY total_models DESC, b.name ASC
    LIMIT 8
  `);

  return rows;
};

const getDealsSection = async (orderBy, limit) => {
  const [rows] = await pool.execute(
    `
      ${PRODUCT_CARD_SELECT}
      ORDER BY ${orderBy}, pv.price ASC, p.id ASC
      LIMIT ?
    `,
    [limit]
  );

  return dedupeByPhone(rows);
};

const getTrendingSearches = async () => {
  const [rows] = await pool.execute(`
    SELECT
      b.name AS label
    FROM brands b
    JOIN phones p ON p.brand_id = b.id
    GROUP BY b.id, b.name
    ORDER BY COUNT(*) DESC, b.name ASC
    LIMIT 6
  `);

  return rows.map((row) => row.label);
};

const getStorefrontHome = async () => {
  const cacheKey = 'storefront:home';
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const [
    heroStats,
    brandTiles,
    topDeals,
    premiumPicks,
    cameraPicks,
    trendingSearches,
  ] = await Promise.all([
    getHeroStats(),
    getBrandTiles(),
    getDealsSection('pv.price ASC', 8),
    getDealsSection('p.spec_score DESC', 8),
    getDealsSection('rear.megapixels DESC', 8),
    getTrendingSearches(),
  ]);

  const payload = {
    heroStats,
    brandTiles,
    trendingSearches,
    sections: {
      topDeals,
      premiumPicks,
      cameraPicks,
    },
  };

  await setCache(cacheKey, payload, 600);
  return payload;
};

const getStorefrontProduct = async (id) => {
  const cacheKey = `storefront:product:${id}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const [rows] = await pool.execute(
    `
      SELECT
        p.id,
        b.name AS brand,
        p.model,
        pl.os,
        p.screen_size AS size_inches,
        p.refresh_rate AS refresh_rate_hz,
        p.battery_capacity AS capacity_mah,
        p.fast_charge AS fast_charge_watts,
        p.wireless_charge,
        p.spec_score,
        p.user_rating,
        pr.name AS chip_name,
        pr.manufacturer AS processor_brand,
        pr.core_count AS cpu_cores,
        pr.process_node_nm,
        dt.type AS panel_type,
        pv.id AS variant_id,
        pv.ram AS ram_gb,
        pv.storage AS internal_gb,
        pv.price AS price_inr,
        rear.megapixels AS rear_main_mp,
        rear.ois,
        front.megapixels AS front_mp
      FROM phones p
      JOIN brands b ON b.id = p.brand_id
      JOIN processors pr ON pr.id = p.processor_id
      LEFT JOIN platforms pl ON pl.id = p.platform_id
      LEFT JOIN display_tech dt ON dt.id = p.display_tech_id
      LEFT JOIN phone_variants pv ON pv.phone_id = p.id
      LEFT JOIN phone_cameras rear
        ON rear.phone_id = p.id
       AND rear.placement = 'rear'
       AND rear.lens_type = 'primary'
      LEFT JOIN phone_cameras front
        ON front.phone_id = p.id
       AND front.placement = 'front'
       AND front.lens_type = 'selfie'
      WHERE p.id = ?
      ORDER BY pv.price ASC, pv.ram ASC, pv.storage ASC
    `,
    [id]
  );

  if (!rows.length) return null;

  const first = rows[0];
  const variants = rows
    .filter((row) => row.variant_id)
    .map((row) => ({
      variant_id: row.variant_id,
      ram_gb: row.ram_gb,
      internal_gb: row.internal_gb,
      price_inr: row.price_inr,
    }));

  const [similarRows] = await pool.execute(
    `
      ${PRODUCT_CARD_SELECT}
      WHERE p.brand_id = (
        SELECT brand_id FROM phones WHERE id = ?
      )
      AND p.id <> ?
      ORDER BY p.spec_score DESC, pv.price ASC
      LIMIT 6
    `,
    [id, id]
  );

  const product = {
    id: first.id,
    brand: first.brand,
    model: first.model,
    os: first.os,
    size_inches: first.size_inches,
    refresh_rate_hz: first.refresh_rate_hz,
    capacity_mah: first.capacity_mah,
    fast_charge_watts: first.fast_charge_watts,
    wireless_charge: Boolean(first.wireless_charge),
    spec_score: first.spec_score,
    user_rating: first.user_rating,
    chip_name: first.chip_name,
    processor_brand: first.processor_brand,
    cpu_cores: first.cpu_cores,
    process_node_nm: first.process_node_nm,
    panel_type: first.panel_type,
    rear_main_mp: first.rear_main_mp,
    front_mp: first.front_mp,
    ois: Boolean(first.ois),
    price_inr: variants[0]?.price_inr ?? null,
    ram_gb: variants[0]?.ram_gb ?? null,
    internal_gb: variants[0]?.internal_gb ?? null,
    variants,
    similarProducts: dedupeByPhone(similarRows),
  };

  await setCache(cacheKey, product, 900);
  return product;
};

export { getStorefrontHome, getStorefrontProduct };
