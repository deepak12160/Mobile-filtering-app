import { pool } from '../config/database.js';
import { getCache, setCache } from '../config/redis.js';

const BASE_SELECT = `
  SELECT
    p.id AS id,
    pv.id AS variant_id,
    b.name AS brand,
    p.model AS model,
    pv.price AS price_inr,
    pl.os AS os,
    rear.megapixels AS rear_main_mp,
    front.megapixels AS front_mp,
    rear.ois AS ois,
    pv.ram AS ram_gb,
    pv.storage AS internal_gb,
    pr.name AS chip_name,
    pr.manufacturer AS processor_brand,
    pr.process_node_nm,
    pr.core_count AS cpu_cores,
    p.screen_size AS size_inches,
    dt.type AS panel_type,
    p.refresh_rate AS refresh_rate_hz,
    p.battery_capacity AS capacity_mah,
    p.fast_charge AS fast_charge_watts,
    p.wireless_charge AS wireless_charge_w
  FROM phones p
  JOIN brands b ON b.id = p.brand_id
  JOIN processors pr ON pr.id = p.processor_id
  LEFT JOIN display_tech dt ON dt.id = p.display_tech_id
  LEFT JOIN platforms pl ON pl.id = p.platform_id
  LEFT JOIN phone_variants pv ON pv.phone_id = p.id
  LEFT JOIN phone_cameras rear
    ON rear.phone_id = p.id
   AND rear.placement = 'rear'
   AND rear.lens_type = 'primary'
  LEFT JOIN phone_cameras front
    ON front.phone_id = p.id
   AND front.placement = 'front'
   AND front.lens_type = 'selfie'
`;

const buildWhereClause = (filters) => {
  const conditions = [];
  const params = [];

  if (filters.brand) {
    conditions.push('b.name = ?');
    params.push(filters.brand);
  }

  if (filters.os) {
    conditions.push('pl.os LIKE ?');
    params.push(`%${filters.os}%`);
  }

  if (filters.min_price !== undefined) {
    conditions.push('pv.price >= ?');
    params.push(filters.min_price);
  }

  if (filters.max_price !== undefined) {
    conditions.push('pv.price <= ?');
    params.push(filters.max_price);
  }

  if (filters.min_ram !== undefined) {
    conditions.push('pv.ram >= ?');
    params.push(filters.min_ram);
  }

  if (filters.max_ram !== undefined) {
    conditions.push('pv.ram <= ?');
    params.push(filters.max_ram);
  }

  if (filters.min_storage !== undefined) {
    conditions.push('pv.storage >= ?');
    params.push(filters.min_storage);
  }

  if (filters.min_camera_mp !== undefined) {
    conditions.push('rear.megapixels >= ?');
    params.push(filters.min_camera_mp);
  }

  if (filters.ois !== undefined) {
    conditions.push('rear.ois = ?');
    params.push(filters.ois === 'true' || filters.ois === '1' ? 1 : 0);
  }

  if (filters.min_battery_mah !== undefined) {
    conditions.push('p.battery_capacity >= ?');
    params.push(filters.min_battery_mah);
  }

  if (filters.fast_charge !== undefined) {
    conditions.push('p.fast_charge >= ?');
    params.push(filters.fast_charge);
  }

  if (filters.min_display_size !== undefined) {
    conditions.push('p.screen_size >= ?');
    params.push(filters.min_display_size);
  }

  if (filters.max_display_size !== undefined) {
    conditions.push('p.screen_size <= ?');
    params.push(filters.max_display_size);
  }

  if (filters.min_refresh_rate !== undefined) {
    conditions.push('p.refresh_rate >= ?');
    params.push(filters.min_refresh_rate);
  }

  if (filters.panel_type) {
    conditions.push('dt.type = ?');
    params.push(filters.panel_type);
  }

  if (filters.processor_brand) {
    conditions.push('pr.manufacturer = ?');
    params.push(filters.processor_brand);
  }

  if (filters.search) {
    const term = `%${filters.search}%`;
    conditions.push('(b.name LIKE ? OR p.model LIKE ? OR pr.name LIKE ?)');
    params.push(term, term, term);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
};

const filterMobiles = async (rawFilters) => {
  const cacheKey = `filter:${JSON.stringify(rawFilters)}`;
  const cached = await getCache(cacheKey);
  if (cached) return { ...cached, fromCache: true };

  const page = Number(rawFilters.page) || 1;
  const limit = Number(rawFilters.limit) || 20;
  const offset = (page - 1) * limit;
  const sortBy = rawFilters.sort_by || 'price_inr';
  const sortOrder = rawFilters.sort_order || 'asc';

  const allowedSorts = {
    price_inr: 'pv.price',
    rear_main_mp: 'rear.megapixels',
    ram_gb: 'pv.ram',
    capacity_mah: 'p.battery_capacity',
    refresh_rate_hz: 'p.refresh_rate',
  };

  const orderCol = allowedSorts[sortBy] || 'pv.price';
  const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
  const { where, params } = buildWhereClause(rawFilters);

  const countSql = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT p.id, pv.id
      FROM phones p
      JOIN brands b ON b.id = p.brand_id
      JOIN processors pr ON pr.id = p.processor_id
      LEFT JOIN display_tech dt ON dt.id = p.display_tech_id
      LEFT JOIN platforms pl ON pl.id = p.platform_id
      LEFT JOIN phone_variants pv ON pv.phone_id = p.id
      LEFT JOIN phone_cameras rear
        ON rear.phone_id = p.id
       AND rear.placement = 'rear'
       AND rear.lens_type = 'primary'
      ${where}
    ) AS filtered
  `;

  const dataSql = `
    ${BASE_SELECT}
    ${where}
    ORDER BY ${orderCol} ${order}, p.id ASC, pv.id ASC
    LIMIT ? OFFSET ?
  `;

  const [[countRows], [rows]] = await Promise.all([
    pool.execute(countSql, params),
    pool.execute(dataSql, [...params, limit, offset]),
  ]);

  const total = countRows[0].total;
  const result = {
    data: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    },
  };

  await setCache(cacheKey, result);
  return result;
};

const getMobileById = async (id) => {
  const cacheKey = `mobile:${id}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const [rows] = await pool.execute(
    `
      ${BASE_SELECT}
      WHERE p.id = ?
      ORDER BY pv.price ASC, pv.ram ASC, pv.storage ASC
    `,
    [id]
  );

  if (!rows.length) return null;

  const mobile = rows[0];
  await setCache(cacheKey, mobile, 1800);
  return mobile;
};

const compareMobiles = async (ids) => {
  const normalizedIds = [...new Set(ids)].sort((a, b) => a - b);
  const cacheKey = `compare:${normalizedIds.join(',')}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const placeholders = normalizedIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `
      ${BASE_SELECT}
      WHERE p.id IN (${placeholders})
      ORDER BY FIELD(p.id, ${placeholders}), pv.price ASC
    `,
    [...normalizedIds, ...normalizedIds]
  );

  const mobiles = normalizedIds
    .map((id) => rows.find((row) => row.id === id))
    .filter(Boolean);

  const specKeys = [
    'price_inr',
    'rear_main_mp',
    'ram_gb',
    'internal_gb',
    'capacity_mah',
    'refresh_rate_hz',
    'size_inches',
  ];

  const diffs = {};
  for (const key of specKeys) {
    const values = mobiles.map((row) => row[key]);
    diffs[key] = { values, differs: new Set(values).size > 1 };
  }

  const result = { mobiles, diffs };
  await setCache(cacheKey, result, 300);
  return result;
};

const getFilterOptions = async () => {
  const cacheKey = 'filter-options';
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const queries = {
    brands: pool.execute('SELECT DISTINCT name AS brand FROM brands ORDER BY name'),
    os: pool.execute('SELECT DISTINCT os FROM platforms WHERE os IS NOT NULL ORDER BY os'),
    panel_types: pool.execute('SELECT DISTINCT type AS panel_type FROM display_tech ORDER BY type'),
    processor_brands: pool.execute(
      'SELECT DISTINCT manufacturer FROM processors WHERE manufacturer IS NOT NULL ORDER BY manufacturer'
    ),
    price_range: pool.execute('SELECT MIN(price) AS min, MAX(price) AS max FROM phone_variants'),
    ram_options: pool.execute('SELECT DISTINCT ram AS ram_gb FROM phone_variants ORDER BY ram'),
    storage_options: pool.execute(
      'SELECT DISTINCT storage AS internal_gb FROM phone_variants ORDER BY storage'
    ),
  };

  const results = await Promise.all(Object.values(queries));
  const options = {};

  Object.keys(queries).forEach((key, index) => {
    options[key] = results[index][0];
  });

  await setCache(cacheKey, options, 3600);
  return options;
};

export { filterMobiles, getMobileById, compareMobiles, getFilterOptions };
