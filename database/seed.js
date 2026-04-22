import dotenv from 'dotenv';
import { pool } from '../config/database.js';

dotenv.config();

const phones = [
  {
    brand: 'Samsung',
    model: 'Galaxy S24 Ultra',
    platform: 'Android 14',
    displayType: 'AMOLED',
    processor: {
      name: 'Snapdragon 8 Gen 3',
      manufacturer: 'Qualcomm',
      coreCount: 8,
      processNodeNm: 4,
    },
    phone: {
      screenSize: 6.8,
      refreshRate: 120,
      batteryCapacity: 5000,
      fastCharge: 45,
      wirelessCharge: 1,
      specScore: 96,
      userRating: 4.8,
    },
    variant: {
      ram: 12,
      storage: 256,
      price: 134999,
    },
    cameras: [
      { placement: 'rear', lensType: 'primary', megapixels: 200, ois: 1 },
      { placement: 'front', lensType: 'selfie', megapixels: 12, ois: 0 },
    ],
  },
  {
    brand: 'Apple',
    model: 'iPhone 15 Pro Max',
    platform: 'iOS 17',
    displayType: 'OLED',
    processor: {
      name: 'A17 Pro',
      manufacturer: 'Apple',
      coreCount: 6,
      processNodeNm: 3,
    },
    phone: {
      screenSize: 6.7,
      refreshRate: 120,
      batteryCapacity: 4441,
      fastCharge: 27,
      wirelessCharge: 1,
      specScore: 94,
      userRating: 4.7,
    },
    variant: {
      ram: 8,
      storage: 256,
      price: 159900,
    },
    cameras: [
      { placement: 'rear', lensType: 'primary', megapixels: 48, ois: 1 },
      { placement: 'front', lensType: 'selfie', megapixels: 12, ois: 0 },
    ],
  },
  {
    brand: 'OnePlus',
    model: '12',
    platform: 'Android 14',
    displayType: 'AMOLED',
    processor: {
      name: 'Snapdragon 8 Gen 3',
      manufacturer: 'Qualcomm',
      coreCount: 8,
      processNodeNm: 4,
    },
    phone: {
      screenSize: 6.82,
      refreshRate: 120,
      batteryCapacity: 5400,
      fastCharge: 100,
      wirelessCharge: 1,
      specScore: 91,
      userRating: 4.6,
    },
    variant: {
      ram: 12,
      storage: 256,
      price: 64999,
    },
    cameras: [
      { placement: 'rear', lensType: 'primary', megapixels: 50, ois: 1 },
      { placement: 'front', lensType: 'selfie', megapixels: 32, ois: 0 },
    ],
  },
];

const getOrCreateId = async (conn, selectSql, insertSql, selectParams, insertParams = selectParams) => {
  const [existingRows] = await conn.execute(selectSql, selectParams);
  if (existingRows.length) return existingRows[0].id;

  const [result] = await conn.execute(insertSql, insertParams);
  return result.insertId;
};

const seed = async () => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query('DELETE FROM user_wishlist');
    await conn.query('DELETE FROM refresh_tokens');
    await conn.query('DELETE FROM phone_cameras');
    await conn.query('DELETE FROM phone_variants');
    await conn.query('DELETE FROM phones');
    await conn.query('DELETE FROM platforms');
    await conn.query('DELETE FROM display_tech');
    await conn.query('DELETE FROM processors');
    await conn.query('DELETE FROM brands');
    await conn.query('DELETE FROM users');

    for (const entry of phones) {
      const brandId = await getOrCreateId(
        conn,
        'SELECT id FROM brands WHERE name = ?',
        'INSERT INTO brands (name) VALUES (?)',
        [entry.brand]
      );

      const processorId = await getOrCreateId(
        conn,
        'SELECT id FROM processors WHERE name = ?',
        'INSERT INTO processors (name, manufacturer, core_count, process_node_nm) VALUES (?, ?, ?, ?)',
        [entry.processor.name],
        [
          entry.processor.name,
          entry.processor.manufacturer,
          entry.processor.coreCount,
          entry.processor.processNodeNm,
        ]
      );

      const platformId = await getOrCreateId(
        conn,
        'SELECT id FROM platforms WHERE os = ?',
        'INSERT INTO platforms (os) VALUES (?)',
        [entry.platform]
      );

      const displayTechId = await getOrCreateId(
        conn,
        'SELECT id FROM display_tech WHERE type = ?',
        'INSERT INTO display_tech (type) VALUES (?)',
        [entry.displayType]
      );

      const [phoneResult] = await conn.execute(
        `INSERT INTO phones
          (brand_id, processor_id, platform_id, display_tech_id, model, screen_size, refresh_rate,
           battery_capacity, fast_charge, wireless_charge, spec_score, user_rating)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          brandId,
          processorId,
          platformId,
          displayTechId,
          entry.model,
          entry.phone.screenSize,
          entry.phone.refreshRate,
          entry.phone.batteryCapacity,
          entry.phone.fastCharge,
          entry.phone.wirelessCharge,
          entry.phone.specScore,
          entry.phone.userRating,
        ]
      );

      const phoneId = phoneResult.insertId;

      await conn.execute(
        'INSERT INTO phone_variants (phone_id, ram, storage, price) VALUES (?, ?, ?, ?)',
        [phoneId, entry.variant.ram, entry.variant.storage, entry.variant.price]
      );

      for (const camera of entry.cameras) {
        await conn.execute(
          'INSERT INTO phone_cameras (phone_id, placement, lens_type, megapixels, ois) VALUES (?, ?, ?, ?, ?)',
          [phoneId, camera.placement, camera.lensType, camera.megapixels, camera.ois]
        );
      }

      console.log(`Inserted: ${entry.brand} ${entry.model}`);
    }

    await conn.commit();
    console.log('Seeding complete');
  } catch (err) {
    await conn.rollback();
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
};

seed();
