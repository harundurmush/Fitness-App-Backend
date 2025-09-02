// scripts/seedExercises.js
require('dotenv').config();
const connectDB = require('../config/db');
const Exercise = require('../models/exerciseModel');

const SEED = [
  {
    slug: 'push_up_standard',
    names: { en: 'Standard Push-up', tr: 'Standart Şınav' },
    descriptions: {
      en: 'A bodyweight push exercise focusing on chest, shoulders, and triceps.',
      tr: 'Göğüs, omuz ve triceps odaklı vücut ağırlığıyla itiş egzersizi.'
    },
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders', 'core'],
    equipment: ['bodyweight'],
    environment: ['home', 'outdoor', 'gym'],
    riskFlags: ['shoulder'],
    tags: ['push', 'strength'],
    cues: {
      en: ['Maintain a straight line from head to heels', 'Elbows ~45°'],
      tr: ['Baş-topuk hizası düz olsun', 'Dirsekler ~45°']
    }
  },
  {
    slug: 'push_up_incline',
    names: { en: 'Incline Push-up', tr: 'Eğimli Şınav' },
    descriptions: {
      en: 'Hands elevated on a bench or table to reduce load.',
      tr: 'Bench/masa üzerinde eller; yük azalır.'
    },
    primaryMuscle: 'chest',
    equipment: ['bodyweight', 'bench'],
    environment: ['home', 'outdoor', 'gym'],
    riskFlags: ['shoulder'],
    tags: ['push', 'beginner'],
    easierOf: 'push_up_standard'
  },
  {
    slug: 'bench_press_barbell',
    names: { en: 'Barbell Bench Press', tr: 'Barbell Bench Press' },
    descriptions: {
      en: 'Compound chest press on a bench using a barbell.',
      tr: 'Barbell ile bench üzerinde çok eklemli itiş.'
    },
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['barbell', 'bench'],
    environment: ['gym'],
    riskFlags: ['shoulder'],
    tags: ['push', 'strength']
  },
  {
    slug: 'dip_parallel_bars',
    names: { en: 'Parallel Bar Dips', tr: 'Paralel Bar Dips' },
    descriptions: {
      en: 'Bodyweight dip focusing on chest and triceps.',
      tr: 'Göğüs ve triceps odaklı vücut ağırlığıyla dips.'
    },
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['bodyweight', 'bars'],
    environment: ['outdoor', 'gym'],
    riskFlags: ['shoulder'],
    tags: ['push', 'strength']
  },
  {
    slug: 'lat_pulldown',
    names: { en: 'Lat Pulldown', tr: 'Lat Pulldown' },
    descriptions: {
      en: 'Vertical pull with cable machine.',
      tr: 'Kablo makinesi ile dikey çekiş.'
    },
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    equipment: ['machine'],
    environment: ['gym'],
    riskFlags: [],
    tags: ['pull']
  },
  {
    slug: 'inverted_row',
    names: { en: 'Inverted Row', tr: 'Ters Sıra (Inverted Row)' },
    descriptions: {
      en: 'Horizontal pull with bodyweight under a bar or table.',
      tr: 'Bar/masa altında vücut ağırlığıyla yatay çekiş.'
    },
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'rear_delts'],
    equipment: ['bodyweight', 'bar'],
    environment: ['home', 'outdoor', 'gym'],
    riskFlags: [],
    tags: ['pull']
  },
  {
    slug: 'squat_bodyweight',
    names: { en: 'Bodyweight Squat', tr: 'Vücut Ağırlığı Squat' },
    descriptions: {
      en: 'Knee/hip dominant lower body exercise.',
      tr: 'Diz/kalça dominant alt vücut egzersizi.'
    },
    primaryMuscle: 'legs',
    secondaryMuscles: ['glutes'],
    equipment: ['bodyweight'],
    environment: ['home', 'outdoor', 'gym'],
    riskFlags: ['knee'],
    tags: ['legs', 'beginner']
  },
  {
    slug: 'plank',
    names: { en: 'Plank', tr: 'Plank' },
    descriptions: {
      en: 'Isometric core stability exercise.',
      tr: 'İzometrik core stabilizasyon egzersizi.'
    },
    primaryMuscle: 'core',
    secondaryMuscles: ['shoulders', 'glutes'],
    equipment: ['bodyweight'],
    environment: ['home', 'outdoor', 'gym'],
    riskFlags: [],
    tags: ['core']
  }
];

(async () => {
  try {
    await connectDB();
    for (const ex of SEED) {
      await Exercise.updateOne({ slug: ex.slug }, { $set: ex }, { upsert: true });
      console.log(`✓ upsert: ${ex.slug}`);
    }
    console.log('✅ Seed completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
})();
