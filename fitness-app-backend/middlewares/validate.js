// middlewares/validate.js
const { celebrate, Segments, Joi } = require('celebrate');

// Ortak parçalar
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

// AUTH
const signupBody = celebrate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().min(2).max(60).required(),
    password: Joi.string().min(6).max(128).required()
  })
});

const loginBody = celebrate({
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required()
  })
});

const refreshBody = celebrate({
  [Segments.BODY]: Joi.object({
    refreshToken: Joi.string().required()
  })
});

// PLAN
const planComputeBody = celebrate({
  [Segments.BODY]: userProfileSchema
});

const planSaveBody = celebrate({
  [Segments.BODY]: userProfileSchema,
  [Segments.QUERY]: Joi.object({
    startDate: Joi.string().isoDate().optional(),
    timezone: Joi.string().optional()
  })
});

const planUpdateBody = celebrate({
  [Segments.PARAMS]: Joi.object({ id: Joi.string().required() }),
  [Segments.BODY]: Joi.object({
    userProfile: userProfileSchema,
    startDate: Joi.string().isoDate().optional(),
    timezone: Joi.string().optional()
  })
});

const planIdParam = celebrate({
  [Segments.PARAMS]: Joi.object({ id: Joi.string().required() })
});

const planListQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    limit: Joi.number().integer().min(1).max(50).optional(),
    page: Joi.number().integer().min(1).optional(),
    sort: Joi.string().optional(),
    // opsiyonel filtreler
    mainGoal: Joi.string().valid('weight_loss','muscle_gain','maintenance').optional(),
    focusArea: Joi.string().optional(),
    location: Joi.string().valid('home','gym','outdoor').optional(),
    frequencyPerWeek: Joi.number().valid(3,5,7).optional(),
    fitnessLevel: Joi.string().valid('beginner','intermediate','advanced').optional(),
    dateFrom: Joi.string().isoDate().optional(),
    dateTo: Joi.string().isoDate().optional()
  })
});

// TODAY
const todayQuery = celebrate({
  [Segments.PARAMS]: Joi.object({ id: Joi.string().required() }),
  [Segments.QUERY]: Joi.object({
    date: Joi.string().isoDate().optional()
  })
});

// LOGS
const logsListQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    planId: Joi.string().optional(),
    dateFrom: Joi.string().isoDate().optional(),
    dateTo: Joi.string().isoDate().optional()
  })
});

const logUpsertBody = celebrate({
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

const logsTodayQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    planId: Joi.string().required()
  })
});

const progressionQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    planId: Joi.string().required(),
    lookbackDays: Joi.number().integer().min(7).max(120).default(21),
    minSessions: Joi.number().integer().min(2).max(20).default(3)
  })
});

// EXERCISES
const exercisesListQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    muscle: Joi.string().optional(),
    environment: Joi.string().valid('home','gym','outdoor').optional(),
    level: Joi.string().valid('beginner','intermediate','advanced').optional(),
    q: Joi.string().optional()
  })
});

const exerciseSlugParam = celebrate({
  [Segments.PARAMS]: Joi.object({ slug: Joi.string().required() })
});

// FAVORITES
const favoriteCreateBody = celebrate({
  [Segments.BODY]: Joi.object({
    exerciseSlug: Joi.string().required(),
    exerciseId: Joi.string().optional()
  })
});

const favoritesListQuery = celebrate({
  [Segments.QUERY]: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    page: Joi.number().integer().min(1).default(1),
    q: Joi.string().optional(),
    includeDetails: Joi.boolean().default(false)
  })
});

const favoriteDeleteQueryOrParam = {
  query: celebrate({
    [Segments.QUERY]: Joi.object({
      exerciseSlug: Joi.string().optional(),
      exerciseId: Joi.string().optional()
    }).or('exerciseSlug','exerciseId')
  }),
  param: celebrate({
    [Segments.PARAMS]: Joi.object({ id: Joi.string().required() })
  })
};

module.exports = {
  // auth
  signupBody, loginBody, refreshBody,
  // plan
  planComputeBody, planSaveBody, planUpdateBody, planIdParam, planListQuery, todayQuery,
  // logs
  logsListQuery, logUpsertBody, logsTodayQuery, progressionQuery,
  // exercises
  exercisesListQuery, exerciseSlugParam,
  // favorites
  favoriteCreateBody, favoritesListQuery, favoriteDeleteQueryOrParam
};
