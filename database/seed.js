
require('dotenv').config();
const { pool } = require('../config/database');

const mobiles = [
  {
    brand: 'Samsung',
    model: 'Galaxy S24 Ultra',
    price: 134999,
    ram: 12,
    storage: 256,
    battery: 5000,
    charging: 45,
    wirelessCharging: 15,
    os: 'Android 14',
    colors: ['Titanium Black', 'Titanium Gray'],
    imageUrl: 'https://images.example.com/s24-ultra.jpg',
    display: { size: 6.8, refresh: 120, type: 'AMOLED', resolution: '3120x1440', brightness: 2600, hdr: 1 },
    processor: { name: 'Snapdragon 8 Gen 3', manufacturer: 'Qualcomm', cores: 8, node: 4 },
    camera: { rear: 200, ultraWide: 12, telephoto: 50, front: 12, rearCount: 4, ois: 1, rearAperture: 'f/1.7', frontAperture: 'f/2.2', video: '8K' },
    storageType: 'UFS 4.0',
    ramType: 'LPDDR5X',
  },
  {
    brand: 'Apple',
    model: 'iPhone 15 Pro Max',
    price: 159900,
    ram: 8,
    storage: 256,
    battery: 4441,
    charging: 27,
    wirelessCharging: 15,
    os: 'iOS 17',
    colors: ['Black Titanium', 'Natural Titanium'],
    imageUrl: 'https://images.example.com/iphone-15-pro-max.jpg',
    display: { size: 6.7, refresh: 120, type: 'OLED', resolution: '2796x1290', brightness: 2000, hdr: 1 },
    processor: { name: 'A17 Pro', manufacturer: 'Apple', cores: 6, node: 3 },
    camera: { rear: 48, ultraWide: 12, telephoto: 12, front: 12, rearCount: 3, ois: 1, rearAperture: 'f/1.8', frontAperture: 'f/1.9', video: '4K' },
    storageType: 'NVMe',
    ramType: 'LPDDR5',
  },
  {
    brand: 'OnePlus',
    model: '12',
    price: 64999,
    ram: 12,
    storage: 256,
    battery: 5400,
    charging: 100,
    wirelessCharging: 50,
    os: 'Android 14',
    colors: ['Flowy Emerald', 'Silky Black'],
    imageUrl: 'https://images.example.com/oneplus-12.jpg',
    display: { size: 6.82, refresh: 120, type: 'AMOLED', resolution: '3168x1440', brightness: 4500, hdr: 1 },
    processor: { name: 'Snapdragon 8 Gen 3', manufacturer: 'Qualcomm', cores: 8, node: 4 },
    camera: { rear: 50, ultraWide: 48, telephoto: 64, front: 32, rearCount: 3, ois: 1, rearAperture: 'f/1.6', frontAperture: 'f/2.4', video: '8K' },
    storageType: 'UFS 4.0',
    ramType: 'LPDDR5X',
  },
];

const seed = async () => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query('DELETE FROM user_wishlist');
    await conn.query('DELETE FROM refresh_tokens');

    await conn.query('DELETE FROM battery');
    await conn.query('DELETE FROM display');
    await conn.query('DELETE FROM ram');
    await conn.query('DELETE FROM storage');
    await conn.query('DELETE FROM cameras');
    await conn.query('DELETE FROM mobiles');

    await conn.query('DELETE FROM phone_cameras');
    await conn.query('DELETE FROM phone_variants');
    await conn.query('DELETE FROM phones');
    await conn.query('DELETE FROM platforms');
    await conn.query('DELETE FROM display_tech');
    await conn.query('DELETE FROM processors');
    await conn.query('DELETE FROM brands');

    for (const m of mobiles) {
      await conn.execute('INSERT IGNORE INTO brands (brand_name) VALUES (?)', [m.brand]);
      const [[brand]] = await conn.execute('SELECT brand_id FROM brands WHERE brand_name = ?', [m.brand]);

      await conn.execute(
        'INSERT IGNORE INTO processors (chipset_name, manufacturer, core_count, process_node_nm) VALUES (?, ?, ?, ?)',
        [m.processor.name, m.processor.manufacturer, m.processor.cores, m.processor.node]
      );
      const [[processor]] = await conn.execute(
        'SELECT processor_id FROM processors WHERE chipset_name = ?',
        [m.processor.name]
      );

      await conn.execute('INSERT IGNORE INTO platforms (platform_name) VALUES (?)', [m.os]);
      const [[platform]] = await conn.execute(
        'SELECT platform_id FROM platforms WHERE platform_name = ?',
        [m.os]
      );

      await conn.execute('INSERT IGNORE INTO display_tech (panel_type) VALUES (?)', [m.display.type]);
      const [[displayTech]] = await conn.execute(
        'SELECT tech_id FROM display_tech WHERE panel_type = ?',
        [m.display.type]
      );

      const [phoneRes] = await conn.execute(
        `INSERT INTO phones
          (brand_id, processor_id, tech_id, model_name, screen_size_inches, refresh_rate_hz,
           battery_capacity_mah, wired_charging_watts, has_wireless_charging)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          brand.brand_id,
          processor.processor_id,
          displayTech.tech_id,
          m.model,
          m.display.size,
          m.display.refresh,
          m.battery,
          m.charging,
          m.wirelessCharging > 0 ? 1 : 0,
        ]
      );

      const phoneId = phoneRes.insertId;

      await conn.execute(
        'INSERT INTO phone_variants (phone_id, platform_id, ram_gb, storage_gb, price_inr) VALUES (?, ?, ?, ?, ?)',
        [phoneId, platform.platform_id, m.ram, m.storage, m.price]
      );

      await conn.execute(
        "INSERT INTO phone_cameras (phone_id, placement, lens_role, megapixels, has_ois) VALUES (?, 'Rear', 'Primary', ?, ?)",
        [phoneId, m.camera.rear, m.camera.ois]
      );
      await conn.execute(
        "INSERT INTO phone_cameras (phone_id, placement, lens_role, megapixels, has_ois) VALUES (?, 'Front', 'Selfie', ?, 0)",
        [phoneId, m.camera.front]
      );

      await conn.execute(
        `INSERT INTO mobiles
          (id, brand, model, price_inr, os, color_options, image_url, is_available)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          phoneId,
          m.brand,
          m.model,
          m.price,
          m.os,
          JSON.stringify(m.colors),
          m.imageUrl,
        ]
      );

      await conn.execute(
        `INSERT INTO cameras
          (mobile_id, rear_main_mp, rear_ultra_wide_mp, rear_telephoto_mp, rear_cameras_count,
           rear_aperture, ois, video_max_res, front_mp, front_aperture)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          phoneId,
          m.camera.rear,
          m.camera.ultraWide,
          m.camera.telephoto,
          m.camera.rearCount,
          m.camera.rearAperture,
          m.camera.ois,
          m.camera.video,
          m.camera.front,
          m.camera.frontAperture,
        ]
      );

      await conn.execute(
        'INSERT INTO storage (mobile_id, internal_gb, is_expandable, max_expand_gb, storage_type) VALUES (?, ?, 0, NULL, ?)',
        [phoneId, m.storage, m.storageType]
      );

      await conn.execute(
        'INSERT INTO ram (mobile_id, ram_gb, ram_type) VALUES (?, ?, ?)',
        [phoneId, m.ram, m.ramType]
      );

      await conn.execute(
        `INSERT INTO display
          (mobile_id, size_inches, resolution, panel_type, refresh_rate_hz, peak_brightness_nits, hdr_support)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          phoneId,
          m.display.size,
          m.display.resolution,
          m.display.type,
          m.display.refresh,
          m.display.brightness,
          m.display.hdr,
        ]
      );

      await conn.execute(
        'INSERT INTO battery (mobile_id, capacity_mah, fast_charge_watts, wireless_charge_w, reverse_charge) VALUES (?, ?, ?, ?, 0)',
        [phoneId, m.battery, m.charging, m.wirelessCharging]
      );

      console.log(`Inserted: ${m.brand} ${m.model}`);
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
