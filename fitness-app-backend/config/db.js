// config/db.js
const mongoose = require('mongoose');

function normalizeUriFromEnv() {
  // Öncelik: MONGO_URI -> MONGODB_URI -> local
  const raw = (process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();
  const localFallback = 'mongodb://127.0.0.1:27017/fitnessapp';

  if (!raw) return localFallback;

  // Hatalı: mongosh komutu yapıştırılmış olabilir
  const hasMongoScheme = raw.startsWith('mongodb://') || raw.startsWith('mongodb+srv://');
  if (!hasMongoScheme) {
    const match = raw.match(/"(mongodb\+srv:\/\/[^"]+)"/i) || raw.match(/"(mongodb:\/\/[^"]+)"/i);
    if (match && match[1]) {
      console.warn('⚠️  Detected a mongosh command; extracted URI inside quotes.');
      return match[1];
    }
    console.error('❌ Invalid MONGO_URI: must start with "mongodb://" or "mongodb+srv://". Falling back to local.');
    return localFallback;
  }

  // Atlas örneklerindeki <password> kalmış mı?
  if (raw.includes('<') || raw.includes('>')) {
    console.warn('⚠️  Your URI contains "<" or ">". Remove angle brackets and use real credentials.');
  }

  return raw;
}

async function connectDB() {
  const uri = normalizeUriFromEnv();

  try {
    // Driver v4+ için extra seçenek gerekmiyor; uyarılardan kurtulmak için sade bağlanıyoruz
    await mongoose.connect(uri);

    const conn = mongoose.connection;
    conn.on('connected', () => console.log('✅ MongoDB connected'));
    conn.on('error', (err) => console.error('❌ MongoDB error:', err));
    conn.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));

    return conn;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    console.error('   Current URI value:', uri);
    console.error('   Tip: Use the "Connect your application" string from Atlas and remove angle brackets.');
    process.exit(1);
  }
}

module.exports = connectDB;
