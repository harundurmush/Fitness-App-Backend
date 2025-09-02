// docs/swagger.js
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const PORT = process.env.PORT || 5000;
const SERVER_URL = process.env.SWAGGER_SERVER_URL || `http://localhost:${PORT}`;

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Fitness App Backend API',
      version: '1.0.0',
      description:
        'Program oluşturma, beslenme, günlük plan, log/progresyon, egzersiz kütüphanesi, favoriler ve kimlik doğrulama uçları.'
    },
    servers: [{ url: `${SERVER_URL}`, description: 'Local server' }],
    components: {
      securitySchemes: {
        // JWT
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Authorization: Bearer <access_token>'
        },
        // Geçiş süreci için (mevcut uçlar)
        UserIdHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-id',
          description: 'Geçici kullanıcı kimliği (JWT yoksa kullan)'
        }
      },
      schemas: {
        // ---------- Auth ----------
        SignupRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            password: { type: 'string', format: 'password' }
          },
          required: ['email', 'name', 'password']
        },
        LoginRequest: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password' }
          },
          required: ['email', 'password']
        },
        RefreshRequest: {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' }
          },
          required: ['refreshToken']
        },
        AuthUser: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string' }
          }
        },
        AuthTokens: {
          type: 'object',
          properties: {
            tokenType: { type: 'string', example: 'Bearer' },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn: { type: 'integer', example: 900 }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: { $ref: '#/components/schemas/AuthUser' },
            tokens: { $ref: '#/components/schemas/AuthTokens' }
          }
        },

        // ---------- Existing ----------
        UserProfile: {
          type: 'object',
          properties: {
            basicInfo: {
              type: 'object',
              properties: {
                gender: { type: 'string' },
                motivationSource: { type: 'string' },
                mainGoal: { type: 'string', enum: ['weight_loss', 'muscle_gain', 'maintenance'] },
                focusArea: { type: 'string' }
              },
              required: ['gender','mainGoal','focusArea']
            },
            physicalMetrics: {
              type: 'object',
              properties: {
                heightCm: { type: 'number' },
                currentWeightKg: { type: 'number' },
                targetWeightKg: { type: 'number' },
                birthYear: { type: 'number' }
              },
              required: ['heightCm','currentWeightKg','targetWeightKg','birthYear']
            },
            workoutPreferences: {
              type: 'object',
              properties: {
                location: { type: 'string', enum: ['home','gym','outdoor'] },
                frequencyPerWeek: { type: 'number', enum: [3,5,7] },
                specificDays: { type: 'array', items: { type: 'string' } },
                injuries: { type: 'array', items: { type: 'string' } }
              },
              required: ['location','frequencyPerWeek','injuries']
            },
            fitnessAssessment: {
              type: 'object',
              properties: {
                fitnessLevel: { type: 'string', enum: ['beginner','intermediate','advanced'] },
                cardioTest: { type: 'string' },
                flexibilityTest: { type: 'string' },
                rewardPreference: { type: 'string' },
                targetMood: { type: 'string' }
              },
              required: ['fitnessLevel']
            }
          },
          required: ['basicInfo','physicalMetrics','workoutPreferences','fitnessAssessment']
        },

        SavePlanResponse: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            createdAt: { type: 'string' },
            message: { type: 'string' },
            planSummary: {
              type: 'object',
              properties: {
                totalWeeks: { type: 'number' },
                phases: { type: 'number' },
                hasNutrition: { type: 'boolean' },
                hasMotivation: { type: 'boolean' },
                milestones: { type: 'number' }
              }
            },
            meta: {
              type: 'object',
              properties: {
                startDate: { type: 'string' },
                timezone: { type: 'string' }
              }
            }
          }
        },

        WorkoutLogUpsert: {
          type: 'object',
          properties: {
            planId: { type: 'string' },
            date: { type: 'string', example: '2025-08-15' },
            sessionNote: { type: 'string' },
            exercises: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  targetSets: { type: 'number' },
                  targetReps: { type: 'number' },
                  rest: { type: 'string' },
                  performedSets: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        reps: { type: 'number' },
                        weightKg: { type: 'number' },
                        rpe: { type: 'number' },
                        success: { type: 'boolean' }
                      }
                    }
                  }
                }
              }
            }
          },
          required: ['planId','date']
        },

        FavoriteCreate: {
          type: 'object',
          properties: {
            exerciseSlug: { type: 'string', example: 'lat_pulldown' },
            exerciseId: { type: 'string', nullable: true, example: '66cfe2f38e2f8f2a5a1b1234' }
          },
          required: ['exerciseSlug']
        },

        FavoriteItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            exerciseSlug: { type: 'string' },
            exerciseId: { type: 'string', nullable: true },
            createdAt: { type: 'string' },
            exercise: { type: 'object' } // includeDetails=true iken
          }
        },

        FavoriteListResponse: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            items: { type: 'array', items: { $ref: '#/components/schemas/FavoriteItem' } }
          }
        }
      }
    },
    security: [], // global zorunlu değil; path bazında Bearer/UserIdHeader belirteceğiz
    paths: {
      // ============ Auth ============
      '/api/auth/signup': {
        post: {
          tags: ['Auth'],
          summary: 'Kayıt ol',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupRequest' } } }
          },
          responses: {
            201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            409: { description: 'Email already registered' }
          }
        }
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Giriş yap',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } }
          },
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            401: { description: 'Invalid credentials' }
          }
        }
      },
      '/api/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Access token yenile',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } } }
          },
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            401: { description: 'Invalid refresh token' }
          }
        }
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Mevcut kullanıcı',
          security: [{ BearerAuth: [] }],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/AuthUser' } } } } } },
            401: { description: 'Unauthorized' }
          }
        }
      },

      // ============ Exercises ============
      '/api/exercises': {
        get: {
          tags: ['Exercises'],
          summary: 'Egzersiz listesini filtreleyerek getir',
          parameters: [
            { in: 'query', name: 'muscle', schema: { type: 'string' } },
            { in: 'query', name: 'environment', schema: { type: 'string', enum: ['home','gym','outdoor'] } },
            { in: 'query', name: 'level', schema: { type: 'string', enum: ['beginner','intermediate','advanced'] } },
            { in: 'query', name: 'q', schema: { type: 'string' }, description: 'Ad/anahtar kelime' }
          ],
          responses: { 200: { description: 'OK' } }
        }
      },
      '/api/exercises/{slug}': {
        get: {
          tags: ['Exercises'],
          summary: 'Slug ile tek egzersiz getir',
          parameters: [{ in: 'path', name: 'slug', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } }
        }
      },

      // ============ Plan ============
      '/api/plan': {
        post: {
          tags: ['Plan'],
          summary: 'Planı hesapla (kaydetmez)',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } } }
          },
          responses: { 200: { description: 'OK' }, 400: { description: 'Validation failed' } }
        }
      },
      '/api/plan/save': {
        post: {
          tags: ['Plan'],
          summary: 'Planı hesapla ve veritabanına kaydet',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [
            { in: 'query', name: 'startDate', schema: { type: 'string' }, description: 'YYYY-MM-DD' },
            { in: 'query', name: 'timezone', schema: { type: 'string' }, description: 'IANA tz (Europe/Istanbul gibi)' }
          ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserProfile' } } }
          },
          responses: {
            201: { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/SavePlanResponse' } } } },
            400: { description: 'Validation failed or missing userId' }
          }
        }
      },
      '/api/plan/plans': {
        get: {
          tags: ['Plan'],
          summary: 'Kayıtlı planları listele',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [
            { in: 'query', name: 'limit', schema: { type: 'integer' } },
            { in: 'query', name: 'page', schema: { type: 'integer' } },
            { in: 'query', name: 'sort', schema: { type: 'string' }, example: 'createdAt:desc' }
          ],
          responses: { 200: { description: 'OK' }, 400: { description: 'userId missing' } }
        }
      },
      '/api/plan/plans/{id}': {
        get: {
          tags: ['Plan'],
          summary: 'Tek plan detayı',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'OK' }, 404: { description: 'Not found' } }
        },
        put: {
          tags: ['Plan'],
          summary: 'Planı güncelle ve yeniden hesapla',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    userProfile: { $ref: '#/components/schemas/UserProfile' },
                    startDate: { type: 'string' },
                    timezone: { type: 'string' }
                  },
                  required: ['userProfile']
                }
              }
            }
          },
          responses: { 200: { description: 'OK' }, 400: { description: 'Validation failed' } }
        },
        delete: {
          tags: ['Plan'],
          summary: 'Planı sil',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Deleted' }, 404: { description: 'Not found' } }
        }
      },
      '/api/plan/plans/{id}/today': {
        get: {
          tags: ['Plan'],
          summary: 'Bugün için plan görünümü',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [
            { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
            { in: 'query', name: 'date', schema: { type: 'string' }, description: 'YYYY-MM-DD (opsiyonel)' }
          ],
          responses: { 200: { description: 'OK' } }
        }
      },

      // ============ Logs ============
      '/api/logs': {
        get: {
          tags: ['Logs'],
          summary: 'Logları listele',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [
            { in: 'query', name: 'planId', schema: { type: 'string' } },
            { in: 'query', name: 'dateFrom', schema: { type: 'string' } },
            { in: 'query', name: 'dateTo', schema: { type: 'string' } }
          ],
          responses: { 200: { description: 'OK' } }
        },
        post: {
          tags: ['Logs'],
          summary: 'Log ekle/güncelle (upsert)',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/WorkoutLogUpsert' } } }
          },
          responses: { 200: { description: 'OK' }, 201: { description: 'Created' } }
        }
      },
      '/api/logs/today': {
        get: {
          tags: ['Logs'],
          summary: 'Bugüne ait log + today view',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [{ in: 'query', name: 'planId', schema: { type: 'string' }, required: true }],
          responses: { 200: { description: 'OK' }, 400: { description: 'Missing params' } }
        }
      },
      '/api/logs/progression': {
        get: {
          tags: ['Logs'],
          summary: 'Progresyon önerileri',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [
            { in: 'query', name: 'planId', schema: { type: 'string' }, required: true },
            { in: 'query', name: 'lookbackDays', schema: { type: 'integer', default: 21 } },
            { in: 'query', name: 'minSessions', schema: { type: 'integer', default: 3 } }
          ],
          responses: { 200: { description: 'OK' } }
        }
      },

      // ============ Favorites ============
      '/api/favorites': {
        get: {
          tags: ['Favorites'],
          summary: 'Favorileri listele',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 } },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'q', schema: { type: 'string' }, description: 'Slug filtreleme (opsiyonel)' },
            { in: 'query', name: 'includeDetails', schema: { type: 'boolean', default: false }, description: 'Egzersiz detaylarını dahil et' }
          ],
          responses: {
            200: {
              description: 'OK',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/FavoriteListResponse' } } }
            },
            400: { description: 'userId missing' }
          }
        },
        post: {
          tags: ['Favorites'],
          summary: 'Favoriye ekle',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/FavoriteCreate' } } }
          },
          responses: {
            201: { description: 'Created' },
            400: { description: 'Validation / userId' },
            409: { description: 'Already in favorites' }
          }
        },
        delete: {
          tags: ['Favorites'],
          summary: 'Favoriden çıkar (query ile)',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [
            { in: 'query', name: 'exerciseSlug', schema: { type: 'string' } },
            { in: 'query', name: 'exerciseId', schema: { type: 'string' } }
          ],
          responses: { 200: { description: 'Removed' }, 400: { description: 'Missing selector' }, 404: { description: 'Not found' } }
        }
      },
      '/api/favorites/toggle': {
        post: {
          tags: ['Favorites'],
          summary: 'Favoriyi toggle et (varsa siler, yoksa ekler)',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/FavoriteCreate' } } }
          },
          responses: {
            201: { description: 'Added' },
            200: { description: 'Removed' },
            400: { description: 'Validation / userId' }
          }
        }
      },
      '/api/favorites/check': {
        get: {
          tags: ['Favorites'],
          summary: 'Belirli bir egzersiz favorilerde mi?',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [{ in: 'query', name: 'exerciseSlug', schema: { type: 'string' }, required: true }],
          responses: { 200: { description: 'OK' }, 400: { description: 'Missing params' } }
        }
      },
      '/api/favorites/{id}': {
        delete: {
          tags: ['Favorites'],
          summary: 'Favoriden çıkar (path ile)',
          security: [{ BearerAuth: [] }, { UserIdHeader: [] }],
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Removed' }, 404: { description: 'Not found' } }
        }
      }
    }
  },
  apis: []
});

module.exports = { swaggerUi, swaggerSpec };
