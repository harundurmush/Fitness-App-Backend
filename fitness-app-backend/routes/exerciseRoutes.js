// routes/exerciseRoutes.js
const express = require('express');
const { celebrate, Segments, Joi, errors } = require('celebrate');
const router = express.Router();
const { listExercises, getExercise } = require('../controllers/exerciseController');

// Listeleme + filtreleme
router.get(
  '/',
  celebrate({
    [Segments.QUERY]: Joi.object({
      muscle: Joi.string().optional(),
      environment: Joi.string().valid('home', 'gym', 'outdoor').optional(),
      level: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
      q: Joi.string().optional()
    })
  }),
  listExercises
);

// Tek kayıt (id veya slug olarak string kabul ediyoruz)
router.get(
  '/:id',
  celebrate({
    [Segments.PARAMS]: Joi.object({
      id: Joi.string().min(1).max(128).required()
    })
  }),
  getExercise
);

// celebrate error handler (route-local)
router.use(errors());

module.exports = router;
