// routes/planRoutes.js
const express = require('express');
const { celebrate, Segments, Joi, errors } = require('celebrate');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();
const {
  generatePlan,
  savePlan,
  getPlans,
  getPlanById,
  updatePlan,
  deletePlan,
  getPlanHistory,
  revertPlanToHistory,
  getTodayView
} = require('../controllers/planController');
const { getRecommendations } = require('../controllers/recommendationController');

// --- Validators ---
const userProfileSchema = Joi.object({
  basicInfo: Joi.object({
    gender: Joi.string().required(),
    motivationSource: Joi.string().optional(),
    mainGoal: Joi.string().valid('weight_loss', 'muscle_gain', 'maintenance').required(),
    focusArea: Joi.string().required()
  }).required(),
  physicalMetrics: Joi.object({
    heightCm: Joi.number().min(120).max(230).required(),
    currentWeightKg: Joi.number().min(30).max(300).required(),
    targetWeightKg: Joi.number().min(30).max(300).disallow(Joi.ref('currentWeightKg')).required(),
    birthYear: Joi.number().min(1900).max(new Date().getFullYear() - 10).required()
  }).required(),
  workoutPreferences: Joi.object({
    location: Joi.string().valid('home', 'gym', 'outdoor').required(),
    frequencyPerWeek: Joi.number().valid(3, 5, 7).required(),
    specificDays: Joi.array().items(Joi.string()).optional(),
    injuries: Joi.array().items(Joi.string().valid('knee','shoulder','lower_back','wrist','ankle')).required()
  }).required(),
  fitnessAssessment: Joi.object({
    fitnessLevel: Joi.string().valid('beginner','intermediate','advanced').required(),
    cardioTest: Joi.string().optional(),
    flexibilityTest: Joi.string().optional(),
    rewardPreference: Joi.string().optional(),
    targetMood: Joi.string().optional()
  }).required()
}).required();

const computeBody = celebrate({
  [Segments.BODY]: userProfileSchema
});

const saveBody = celebrate({
  [Segments.BODY]: userProfileSchema,
  [Segments.QUERY]: Joi.object({
    startDate: Joi.string().isoDate().optional(),
    timezone: Joi.string().optional()
  })
});

const idParam = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().required()
  })
});

const idAndHistoryParams = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().required(),
    historyId: Joi.string().required()
  })
});

const listQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    limit: Joi.number().integer().min(1).max(50).optional(),
    page: Joi.number().integer().min(1).optional(),
    sort: Joi.string().optional(),
    mainGoal: Joi.string().valid('weight_loss','muscle_gain','maintenance').optional(),
    focusArea: Joi.string().optional(),
    location: Joi.string().valid('home','gym','outdoor').optional(),
    frequencyPerWeek: Joi.number().valid(3,5,7).optional(),
    fitnessLevel: Joi.string().valid('beginner','intermediate','advanced').optional(),
    dateFrom: Joi.string().isoDate().optional(),
    dateTo: Joi.string().isoDate().optional()
  })
});

const updateBody = celebrate({
  [Segments.PARAMS]: Joi.object({ id: Joi.string().required() }),
  [Segments.BODY]: Joi.object({
    userProfile: userProfileSchema,
    startDate: Joi.string().isoDate().optional(),
    timezone: Joi.string().optional()
  })
});

const todayQuery = celebrate({
  [Segments.PARAMS]: Joi.object({ id: Joi.string().required() }),
  [Segments.QUERY]: Joi.object({
    date: Joi.string().isoDate().optional()
  })
});

// Plan oluşturma (sadece hesapla, kaydetme) — public
router.post('/', computeBody, generatePlan);

// Planı oluştur + veritabanına kaydet (korumalı)
router.post('/save', authRequired, saveBody, savePlan);

// Kayıtlı planları listele
router.get('/plans', authRequired, listQuery, getPlans);

// Tek plan detayı
router.get('/plans/:id', authRequired, idParam, getPlanById);

// Plan bugünün görünümü
router.get('/plans/:id/today', authRequired, todayQuery, getTodayView);

// Plan geçmişi
router.get('/plans/:id/history', authRequired, idParam, getPlanHistory);

// Snapshot'a geri dön
router.post('/plans/:id/revert/:historyId', authRequired, idAndHistoryParams, revertPlanToHistory);

// Plan güncelle
router.put('/plans/:id', authRequired, updateBody, updatePlan);

// Plan sil
router.delete('/plans/:id', authRequired, idParam, deletePlan);

// Plan kategorisi önerileri (public)
router.get('/recommendations', getRecommendations);

// celebrate error handler (route-local)
router.use(errors());

module.exports = router;
