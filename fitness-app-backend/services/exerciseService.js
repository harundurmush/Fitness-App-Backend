// services/exerciseService.js
const Exercise = require('../models/exerciseModel');

// Basit arama/filtreleme
async function searchExercises({ q, muscle, equipment, environment, risk, limit = 50, page = 1, sort = 'names.en:asc' }) {
  const filter = {};
  if (q && q.trim()) {
    const rx = new RegExp(q.trim(), 'i');
    filter.$or = [
      { 'names.en': rx },
      { 'names.tr': rx },
      { slug: rx },
      { tags: rx }
    ];
  }
  if (muscle) filter.primaryMuscle = muscle;
  if (equipment) filter.equipment = equipment;
  if (environment) filter.environment = environment;
  if (risk) filter.riskFlags = risk;

  const [field, dirRaw] = (sort || '').split(':');
  const dir = dirRaw === 'desc' ? -1 : 1;
  const sortObj = field ? { [field]: dir } : { 'names.en': 1 };

  const l = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (p - 1) * l;

  const [items, total] = await Promise.all([
    Exercise.find(filter).sort(sortObj).skip(skip).limit(l),
    Exercise.countDocuments(filter)
  ]);

  return { items, total, page: p, limit: l, sort: sortObj, filter };
}

// ID veya slug ile tek kayıt
async function getExerciseById(idOrSlug) {
  if (!idOrSlug) return null;
  if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
    return Exercise.findById(idOrSlug);
  }
  return Exercise.findOne({ slug: idOrSlug });
}

// İsim → exerciseId çözümleme (basit eşleşme)
// names.tr / names.en içine bakar; eşleşme yoksa null döner
async function resolveNameToExerciseId(name) {
  if (!name) return null;
  const rx = new RegExp(`^${name.trim()}$`, 'i');
  const doc = await Exercise.findOne({
    $or: [{ 'names.en': rx }, { 'names.tr': rx }, { slug: rx }]
  }).select('_id');
  return doc ? String(doc._id) : null;
}

module.exports = {
  searchExercises,
  getExerciseById,
  resolveNameToExerciseId
};
