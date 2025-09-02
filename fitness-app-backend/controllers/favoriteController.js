// controllers/favoriteController.js
const Favorite = require('../models/favoriteModel');
const mongoose = require('mongoose');

function getUserId(req) {
  return (
    req.header('x-user-id') ||
    (req.body && req.body.userId) ||
    (req.query && req.query.userId) ||
    null
  );
}

// POST /api/favorites
// Body: { exerciseSlug: "lat_pulldown", exerciseId?: "<mongoId>" }
exports.addFavorite = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId is required (x-user-id header or in body)' });

    const { exerciseSlug, exerciseId } = req.body || {};
    if (!exerciseSlug) return res.status(400).json({ error: 'exerciseSlug is required' });

    try {
      const doc = await Favorite.create({ userId, exerciseSlug, exerciseId });
      return res.status(201).json({
        id: doc._id,
        userId: doc.userId,
        exerciseSlug: doc.exerciseSlug,
        exerciseId: doc.exerciseId || null,
        createdAt: doc.createdAt
      });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ error: 'Already in favorites' });
      }
      throw err;
    }
  } catch (err) {
    console.error('addFavorite error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/favorites/toggle
// Body: { exerciseSlug, exerciseId? }
exports.toggleFavorite = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId is required (x-user-id header or in body)' });

    const { exerciseSlug, exerciseId } = req.body || {};
    if (!exerciseSlug) return res.status(400).json({ error: 'exerciseSlug is required' });

    const exists = await Favorite.findOne({ userId, exerciseSlug });
    if (exists) {
      await Favorite.deleteOne({ _id: exists._id });
      return res.status(200).json({ removed: true, exerciseSlug });
    } else {
      const doc = await Favorite.create({ userId, exerciseSlug, exerciseId });
      return res.status(201).json({
        added: true,
        id: doc._id,
        exerciseSlug: doc.exerciseSlug,
        exerciseId: doc.exerciseId || null
      });
    }
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(200).json({ added: false, removed: false, note: 'Already in favorites' });
    }
    console.error('toggleFavorite error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/favorites/check?exerciseSlug=...
exports.checkFavorite = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const { exerciseSlug } = req.query || {};
    if (!exerciseSlug) return res.status(400).json({ error: 'exerciseSlug is required' });

    const exists = await Favorite.exists({ userId, exerciseSlug });
    return res.status(200).json({ exists: !!exists });
  } catch (err) {
    console.error('checkFavorite error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/favorites?limit=&page=&q=&includeDetails=true
exports.listFavorites = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId is required (x-user-id header or ?userId=...)' });

    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    const includeDetails = String(req.query.includeDetails || 'false').toLowerCase() === 'true';
    const q = (req.query.q || '').trim();

    // Basit filtre
    const filter = { userId };
    if (q) {
      // güvenli case-insensitive regex
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.exerciseSlug = { $regex: safe, $options: 'i' };
    }

    // details istenmiyorsa klasik find + map
    if (!includeDetails) {
      const [items, total] = await Promise.all([
        Favorite.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Favorite.countDocuments(filter)
      ]);
      return res.status(200).json({
        page, limit, total,
        items: items.map((f) => ({
          id: f._id,
          exerciseSlug: f.exerciseSlug,
          exerciseId: f.exerciseId || null,
          createdAt: f.createdAt
        }))
      });
    }

    // includeDetails=true → exercises koleksiyonundan lookup ile zenginleştir
    // Not: Exercises koleksiyonunda slug alanı olduğunu varsayıyoruz.
    const pipeline = [
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'exercises',
          let: { favSlug: '$exerciseSlug' },
          pipeline: [
            { $match: { $expr: { $eq: ['$slug', '$$favSlug'] } } },
            {
              $project: {
                _id: 1,
                slug: 1,
                name: 1,
                primaryMuscle: 1,
                level: 1,
                environment: 1,
                media: 1
              }
            }
          ],
          as: 'exercise'
        }
      },
      { $addFields: { exercise: { $arrayElemAt: ['$exercise', 0] } } },
      {
        $project: {
          _id: 1,
          exerciseSlug: 1,
          exerciseId: 1,
          createdAt: 1,
          exercise: 1
        }
      }
    ];

    const [items, totalArr] = await Promise.all([
      Favorite.aggregate(pipeline),
      Favorite.aggregate([{ $match: filter }, { $count: 'cnt' }])
    ]);
    const total = totalArr[0]?.cnt || 0;

    return res.status(200).json({
      page, limit, total,
      items: items.map(f => ({
        id: f._id,
        exerciseSlug: f.exerciseSlug,
        exerciseId: f.exerciseId || null,
        createdAt: f.createdAt,
        exercise: f.exercise || null
      }))
    });
  } catch (err) {
    console.error('listFavorites error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/favorites/:id
// veya DELETE /api/favorites?exerciseSlug=... (ya da exerciseId=...)
exports.removeFavorite = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId is required (x-user-id header or ?userId=...)' });

    const { id } = req.params;
    const { exerciseSlug, exerciseId } = req.query;

    const filter = { userId };
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid id' });
      }
      filter._id = new mongoose.Types.ObjectId(id);
    } else if (exerciseSlug) {
      filter.exerciseSlug = exerciseSlug;
    } else if (exerciseId) {
      if (!mongoose.Types.ObjectId.isValid(exerciseId)) {
        return res.status(400).json({ error: 'Invalid exerciseId' });
      }
      filter.exerciseId = new mongoose.Types.ObjectId(exerciseId);
    } else {
      return res.status(400).json({ error: 'Provide :id path param or ?exerciseSlug= / ?exerciseId=' });
    }

    const result = await Favorite.deleteOne(filter);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    return res.status(200).json({ message: 'Favorite removed' });
  } catch (err) {
    console.error('removeFavorite error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
