const { pool } = require('../config/database');
const { getCache, setCache } = require('../config/redis');

const FULL_SELECT = `
  SELECT
    p.phone_id AS id,
    b.brand_name AS brand,
    p.model_name AS model,
    pv.price_inr AS price_inr,
    pl.platform_name AS os,
    rear.megapixels AS rear_main_mp,
    front.megapixels AS front_mp,
    rear.has_ois AS ois,
    pv.ram_gb AS ram_gb,
    pv.storage_gb AS internal_gb,
    pr.chipset_name AS chip_name,
    pr.manufacturer AS processor_brand,
    pr.process_node_nm,
    pr.core_count AS cpu_cores,
    p.screen_size_inches AS size_inches,
    dt.panel_type AS panel_type,
    p.refresh_rate_hz,
    p.battery_capacity_mah AS capacity_mah,
    p.wired_charging_watts AS fast_charge_watts,
    p.has_wireless_charging AS wireless_charge_w
  FROM phones p
  JOIN brands b ON b.brand_id = p.brand_id
  JOIN processors pr ON pr.processor_id = p.processor_id
  JOIN display_tech dt ON dt.tech_id = p.tech_id
  LEFT JOIN phone_variants pv ON pv.phone_id = p.phone_id
  LEFT JOIN platforms pl ON pl.platform_id = pv.platform_id
  LEFT JOIN phone_cameras rear
    ON rear.phone_id = p.phone_id
   AND rear.placement = 'Rear'
   AND rear.lens_role = 'Primary'
  LEFT JOIN phone_cameras front
    ON front.phone_id = p.phone_id
   AND front.placement = 'Front'
   AND front.lens_role = 'Selfie'
`;

const buildWhereClause = (filters) => {
  const conditions = ["p.availability_status <> 'Discontinued'"];
  const params = [];

  if (filters.brand) {
    conditions.push('b.brand_name = ?');
    params.push(filters.brand);
  }
  if (filters.os) {
    conditions.push('pl.platform_name LIKE ?');
    params.push(`%${filters.os}%`);
  }
  if (filters.min_price !== undefined) {
    conditions.push('pv.price_inr >= ?');
    params.push(filters.min_price);
  }
  if (filters.max_price !== undefined) {
    conditions.push('pv.price_inr <= ?');
    params.push(filters.max_price);
  }
  if (filters.min_ram !== undefined) {
    conditions.push('pv.ram_gb >= ?');
    params.push(filters.min_ram);
  }
  if (filters.max_ram !== undefined) {
    conditions.push('pv.ram_gb <= ?');
    params.push(filters.max_ram);
  }
  if (filters.min_storage !== undefined) {
    conditions.push('pv.storage_gb >= ?');
    params.push(filters.min_storage);
  }
  if (filters.min_camera_mp !== undefined) {
    conditions.push('rear.megapixels >= ?');
    params.push(filters.min_camera_mp);
  }
  if (filters.ois !== undefined) {
    conditions.push('rear.has_ois = ?');
    params.push(filters.ois === 'true' || filters.ois === '1' ? 1 : 0);
  }
  if (filters.min_battery_mah !== undefined) {
    conditions.push('p.battery_capacity_mah >= ?');
    params.push(filters.min_battery_mah);
  }
  if (filters.fast_charge !== undefined) {
    conditions.push('p.wired_charging_watts >= ?');
    params.push(filters.fast_charge);
  }
  if (filters.min_display_size !== undefined) {
    conditions.push('p.screen_size_inches >= ?');
    params.push(filters.min_display_size);
  }
  if (filters.max_display_size !== undefined) {
    conditions.push('p.screen_size_inches <= ?');
    params.push(filters.max_display_size);
  }
  if (filters.min_refresh_rate !== undefined) {
    conditions.push('p.refresh_rate_hz >= ?');
    params.push(filters.min_refresh_rate);
  }
  if (filters.panel_type) {
    conditions.push('dt.panel_type = ?');
    params.push(filters.panel_type);
  }
  if (filters.processor_brand) {
    conditions.push('pr.manufacturer = ?');
    params.push(filters.processor_brand);
  }
  if (filters.search) {
    conditions.push('(b.brand_name LIKE ? OR p.model_name LIKE ? OR pr.chipset_name LIKE ?)');
    const term = `%${filters.search}%`;
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

  const page = rawFilters.page || 1;
  const limit = rawFilters.limit || 20;
  const offset = (page - 1) * limit;
  const sortBy = rawFilters.sort_by || 'price_inr';
  const sortOrder = rawFilters.sort_order || 'asc';

  const allowedSorts = {
    price_inr: 'pv.price_inr',
    rear_main_mp: 'rear.megapixels',
    ram_gb: 'pv.ram_gb',
    capacity_mah: 'p.battery_capacity_mah',
    refresh_rate_hz: 'p.refresh_rate_hz',
  };

  const orderCol = allowedSorts[sortBy] || 'pv.price_inr';
  const order = sortOrder === 'desc' ? 'DESC' : 'ASC';
  const { where, params } = buildWhereClause(rawFilters);

  const countSql = `
    SELECT COUNT(DISTINCT p.phone_id) AS total
    FROM phones p
    JOIN brands b ON b.brand_id = p.brand_id
    JOIN processors pr ON pr.processor_id = p.processor_id
    JOIN display_tech dt ON dt.tech_id = p.tech_id
    LEFT JOIN phone_variants pv ON pv.phone_id = p.phone_id
    LEFT JOIN platforms pl ON pl.platform_id = pv.platform_id
    LEFT JOIN phone_cameras rear
      ON rear.phone_id = p.phone_id
     AND rear.placement = 'Rear'
     AND rear.lens_role = 'Primary'
    ${where}
  `;

  const dataSql = `
    ${FULL_SELECT}
    ${where}
    ORDER BY ${orderCol} ${order}
    LIMIT ? OFFSET ?
  `;

  const [[countRows], [rows]] = await Promise.all([
    pool.execute(countSql, params),
    pool.execute(dataSql, [...params, limit, offset]),
  ]);

  const total = countRows[0].total;
  const result = {
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 0 },
  };

  await setCache(cacheKey, result);
  return result;
};

const getMobileById = async (id) => {
  const cacheKey = `mobile:${id}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const [rows] = await pool.execute(`${FULL_SELECT} WHERE p.phone_id = ?`, [id]);
  if (!rows.length) return null;

  await setCache(cacheKey, rows[0], 1800);
  return rows[0];
};

const compareMobiles = async (ids) => {
  const normalizedIds = [...ids].sort((a, b) => a - b);
  const cacheKey = `compare:${normalizedIds.join(',')}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const placeholders = normalizedIds.map(() => '?').join(',');
  const [rows] = await pool.execute(
    `${FULL_SELECT} WHERE p.phone_id IN (${placeholders}) ORDER BY FIELD(p.phone_id, ${placeholders})`,
    [...normalizedIds, ...normalizedIds]
  );

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
    const values = rows.map((row) => row[key]);
    diffs[key] = { values, differs: new Set(values).size > 1 };
  }

  const result = { mobiles: rows, diffs };
  await setCache(cacheKey, result, 300);
  return result;
};

const getFilterOptions = async () => {
  const cacheKey = 'filter-options';
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const queries = {
    brands: pool.execute('SELECT DISTINCT brand_name AS brand FROM brands ORDER BY brand_name'),
    os: pool.execute('SELECT DISTINCT platform_name AS os FROM platforms ORDER BY platform_name'),
    panel_types: pool.execute('SELECT DISTINCT panel_type FROM display_tech ORDER BY panel_type'),
    processor_brands: pool.execute('SELECT DISTINCT manufacturer FROM processors WHERE manufacturer IS NOT NULL ORDER BY manufacturer'),
    price_range: pool.execute('SELECT MIN(price_inr) AS min, MAX(price_inr) AS max FROM phone_variants'),
    ram_options: pool.execute('SELECT DISTINCT ram_gb FROM phone_variants ORDER BY ram_gb'),
    storage_options: pool.execute('SELECT DISTINCT storage_gb AS internal_gb FROM phone_variants ORDER BY storage_gb'),
  };

  const results = await Promise.all(Object.values(queries));
  const options = {};
  Object.keys(queries).forEach((key, index) => {
    options[key] = results[index][0];
  });

  await setCache(cacheKey, options, 3600);
  return options;
};

module.exports = { filterMobiles, getMobileById, compareMobiles, getFilterOptions };
