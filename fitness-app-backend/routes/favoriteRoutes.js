// routes/favoriteRoutes.js
const express = require('express');
const { celebrate, Segments, Joi, errors } = require('celebrate');
const { authRequired } = require('../middlewares/auth');

const router = express.Router();
const {
  addFavorite,
  listFavorites,
  removeFavorite,
  toggleFavorite,
  checkFavorite
} = require('../controllers/favoriteController');

// --- Validators ---
const bodyFavorite = celebrate({
  [Segments.BODY]: Joi.object({
    exerciseSlug: Joi.string().min(1).required(),
    exerciseId: Joi.string().optional()
  })
});

const listQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    page: Joi.number().integer().min(1).default(1),
    q: Joi.string().optional(),
    includeDetails: Joi.boolean().default(false)
  })
});

const deleteQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    exerciseSlug: Joi.string().optional(),
    exerciseId: Joi.string().optional()
  }).or('exerciseSlug', 'exerciseId')
});

const idParam = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().required()
  })
});

const checkQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    exerciseSlug: Joi.string().required()
  })
});

// Ekle
router.post('/', authRequired, bodyFavorite, addFavorite);

// Toggle (varsa siler, yoksa ekler)
router.post('/toggle', authRequired, bodyFavorite, toggleFavorite);

// Var mı?
router.get('/check', authRequired, checkQuery, checkFavorite);

// Listele
router.get('/', authRequired, listQuery, listFavorites);

// Silme: iki ayrı yol (optional param yerine ikili tanım)
router.delete('/', authRequired, deleteQuery, removeFavorite);     // ?exerciseSlug=... veya ?exerciseId=...
router.delete('/:id', authRequired, idParam, removeFavorite);      // path param ile

// celebrate error handler (route-local)
router.use(errors());

module.exports = router;
