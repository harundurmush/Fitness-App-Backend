// models/exerciseModel.js
const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema(
  {
    // benzersiz kısa kimlik (ör. "push_up_standard")
    slug: { type: String, required: true, unique: true, index: true },

    // çok dilli ad/açıklama
    names: {
      en: { type: String, required: true },
      tr: { type: String, required: true }
    },
    descriptions: {
      en: { type: String, default: '' },
      tr: { type: String, default: '' }
    },

    // temel alanlar
    primaryMuscle: {
      type: String,
      enum: ['chest', 'back', 'legs', 'core', 'arms', 'shoulders', 'glutes', 'full_body'],
      required: true
    },
    secondaryMuscles: [String],

    equipment: {
      type: [String],
      default: [] // ör: ['barbell','dumbbell','machine','band','bodyweight','bench']
    },

    environment: {
      type: [String],
      enum: ['home', 'gym', 'outdoor'],
      default: []
    },

    // güvenlik/yaralanma ilişkisi (filtreleme için)
    riskFlags: {
      type: [String],
      enum: ['knee', 'shoulder', 'lower_back', 'wrist', 'ankle'],
      default: []
    },

    // serbest etiketler (örn: 'push','pull','plyo','strength','hypertrophy')
    tags: { type: [String], default: [] },

    // teknik ipuçları
    cues: {
      en: { type: [String], default: [] },
      tr: { type: [String], default: [] }
    },

    // varyasyon ilişkileri (opsiyonel)
    easierOf: { type: String, default: null }, // başka bir slug’ın kolay alternatifi
    harderOf: { type: String, default: null }  // başka bir slug’ın zor alternatifi
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exercise', ExerciseSchema);
