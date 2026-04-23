import 'dotenv/config';
import { pool } from '../config/database.js';

// Rest of your seeding logic...

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
  {
    brand: 'Google',
    model: 'Pixel 8 Pro',
    price: 106999,
    ram: 12,
    storage: 128,
    battery: 5050,
    charging: 30,
    wirelessCharging: 23,
    os: 'Android 14',
    colors: ['Obsidian', 'Porcelain', 'Bay'],
    imageUrl: 'https://images.example.com/pixel-8-pro.jpg',
    display: { size: 6.7, refresh: 120, type: 'OLED', resolution: '2992x1344', brightness: 2400, hdr: 1 },
    processor: { name: 'Tensor G3', manufacturer: 'Google', cores: 9, node: 4 },
    camera: { rear: 50, ultraWide: 48, telephoto: 48, front: 10.5, rearCount: 3, ois: 1, rearAperture: 'f/1.68', frontAperture: 'f/2.2', video: '4K' },
    storageType: 'UFS 3.1',
    ramType: 'LPDDR5X',
  },
  {
    brand: 'Xiaomi',
    model: '14 Ultra',
    price: 99999,
    ram: 16,
    storage: 512,
    battery: 5000,
    charging: 90,
    wirelessCharging: 80,
    os: 'HyperOS',
    colors: ['Black', 'White'],
    imageUrl: 'https://images.example.com/xiaomi-14-ultra.jpg',
    display: { size: 6.73, refresh: 120, type: 'AMOLED', resolution: '3200x1440', brightness: 3000, hdr: 1 },
    processor: { name: 'Snapdragon 8 Gen 3', manufacturer: 'Qualcomm', cores: 8, node: 4 },
    camera: { rear: 50, ultraWide: 50, telephoto: 50, front: 32, rearCount: 4, ois: 1, rearAperture: 'f/1.63', frontAperture: 'f/2.0', video: '8K' },
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

    await conn.query('DELETE FROM phone_cameras');
    await conn.query('DELETE FROM phone_variants');
    await conn.query('DELETE FROM phones');
    await conn.query('DELETE FROM platforms');
    await conn.query('DELETE FROM display_tech');
    await conn.query('DELETE FROM processors');
    await conn.query('DELETE FROM brands');

    for (const m of mobiles) {
      await conn.execute('INSERT IGNORE INTO brands (name) VALUES (?)', [m.brand]);
      const [[brand]] = await conn.execute('SELECT id FROM brands WHERE name = ?', [m.brand]);

      await conn.execute(
        'INSERT IGNORE INTO processors (name, manufacturer, core_count, process_node_nm) VALUES (?, ?, ?, ?)',
        [m.processor.name, m.processor.manufacturer, m.processor.cores, m.processor.node]
      );
      const [[processor]] = await conn.execute(
        'SELECT id FROM processors WHERE name = ?',
        [m.processor.name]
      );

      await conn.execute('INSERT IGNORE INTO platforms (os) VALUES (?)', [m.os]);
      const [[platform]] = await conn.execute(
        'SELECT id FROM platforms WHERE os = ?',
        [m.os]
      );

      await conn.execute('INSERT IGNORE INTO display_tech (type) VALUES (?)', [m.display.type]);
      const [[displayTech]] = await conn.execute(
        'SELECT id FROM display_tech WHERE type = ?',
        [m.display.type]
      );

      const [phoneRes] = await conn.execute(
        `INSERT INTO phones
          (brand_id, processor_id, display_tech_id, platform_id, model, screen_size, refresh_rate,
           battery_capacity, fast_charge, wireless_charge, spec_score, user_rating)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          brand.id,
          processor.id,
          displayTech.id,
          platform.id,
          m.model,
          m.display.size,
          m.display.refresh,
          m.battery,
          m.charging,
          m.wirelessCharging > 0 ? 1 : 0,
          Math.floor(Math.random() * 20) + 80, // Random spec score for demo
          (Math.random() * 1 + 4).toFixed(1),  // Random rating 4.0-5.0
        ]
      );

      const phoneId = phoneRes.insertId;

      await conn.execute(
        'INSERT INTO phone_variants (phone_id, ram, storage, price) VALUES (?, ?, ?, ?)',
        [phoneId, m.ram, m.storage, m.price]
      );

      await conn.execute(
        "INSERT INTO phone_cameras (phone_id, placement, lens_type, megapixels, ois) VALUES (?, 'rear', 'primary', ?, ?)",
        [phoneId, m.camera.rear, m.camera.ois]
      );
      await conn.execute(
        "INSERT INTO phone_cameras (phone_id, placement, lens_type, megapixels, ois) VALUES (?, 'front', 'selfie', ?, 0)",
        [phoneId, m.camera.front]
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
