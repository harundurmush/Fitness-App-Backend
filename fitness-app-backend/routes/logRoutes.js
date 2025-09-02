// routes/logRoutes.js
const express = require('express');
const { celebrate, Segments, Joi, errors } = require('celebrate');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();
const { upsertLog, getTodayLog, listLogs } = require('../controllers/logController');
const { getProgression, applyProgression } = require('../controllers/progressionController'); // UPDATED

// --- Validators ---
const upsertBody = celebrate({
  [Segments.BODY]: Joi.object({
    planId: Joi.string().required(),
    date: Joi.string().isoDate().required(),
    sessionNote: Joi.string().allow('').optional(),
    exercises: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        targetSets: Joi.number().integer().min(1).max(10).optional(),
        targetReps: Joi.number().integer().min(1).max(30).optional(),
        rest: Joi.string().optional(),
        performedSets: Joi.array().items(
          Joi.object({
            reps: Joi.number().integer().min(0).max(100).required(),
            weightKg: Joi.number().min(0).max(500).optional(),
            rpe: Joi.number().min(1).max(10).optional(),
            success: Joi.boolean().optional()
          })
        ).optional()
      })
    ).optional()
  })
});

const todayQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    planId: Joi.string().required()
  })
});

const listQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    planId: Joi.string().optional(),
    dateFrom: Joi.string().isoDate().optional(),
    dateTo: Joi.string().isoDate().optional()
  })
});

const progressionQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    planId: Joi.string().required(),
    lookbackDays: Joi.number().integer().min(7).max(120).default(21),
    minSessions: Joi.number().integer().min(2).max(20).default(3)
  })
});

const applyBody = celebrate({
  [Segments.BODY]: Joi.object({
    planId: Joi.string().required(),
    dryRun: Joi.boolean().default(true)
    // diğer alanlar serbest kalsın:
  }).unknown(true)
});

// Log oluştur/güncelle
router.post('/', authRequired, upsertBody, upsertLog);

// Bugünün logu + today view
router.get('/today', authRequired, todayQuery, getTodayLog);

// Listeleme
router.get('/', authRequired, listQuery, listLogs);

// Progresyon önerileri
router.get('/progression', authRequired, progressionQuery, getProgression);

// --- NEW --- Progresyonu plana uygula
router.post('/progression/apply', authRequired, applyBody, applyProgression);

// celebrate error handler (route-local)
router.use(errors());

module.exports = router;
