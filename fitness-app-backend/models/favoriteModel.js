// models/favoriteModel.js
const mongoose = require('mongoose');

const FavoriteSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },

    // Egzersizi referanslamak için iki alan bırakıyoruz:
    // - exerciseSlug: zorunlu ve benzersiz (kullanıcı bazında)
    // - exerciseId: varsa (örn: exercises koleksiyonunda _id), opsiyonel
    exerciseSlug: { type: String, required: true },
    exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: false }
  },
  { timestamps: true }
);

// Aynı kullanıcı aynı egzersizi iki kez favoriye alamaz
FavoriteSchema.index({ userId: 1, exerciseSlug: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', FavoriteSchema);
