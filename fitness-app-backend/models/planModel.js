// models/planModel.js
const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema(
  {
    // NEW: exerciseId (katalog id’si) — opsiyonel, geriye uyum için name korunur
    exerciseId: { type: String, default: null },
    name: String,
    sets: Number,
    reps: Number,
    rest: String
  },
  { _id: false }
);

const DaySchema = new mongoose.Schema(
  {
    dayIso: { type: Number, min: 1, max: 7 },
    dayName: String,
    phase: String,
    exercises: [ExerciseSchema]
  },
  { _id: false }
);

const WeekSchema = new mongoose.Schema(
  { week: Number, phase: String, days: [DaySchema] },
  { _id: false }
);

const MilestoneSchema = new mongoose.Schema(
  {
    week: Number,
    title: String,
    body: String,
    type: { type: String, enum: ['phase', 'progress', 'goal'] }
  },
  { _id: false }
);

const PlanPayloadSchema = new mongoose.Schema(
  {
    totalWeeks: Number,
    progression: [String],
    weeks: [WeekSchema],
    nutrition: {
      bmr: Number,
      tdee: Number,
      calorieTarget: Number,
      macros: { protein_g: Number, fat_g: Number, carbs_g: Number }
    },
    motivation: { messages: [String] },
    milestones: [MilestoneSchema]
  },
  { _id: false }
);

const PlanSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },

    userProfile: {
      basicInfo: {
        gender: String,
        motivationSource: String,
        mainGoal: String,
        focusArea: String
      },
      physicalMetrics: {
        heightCm: Number,
        currentWeightKg: Number,
        targetWeightKg: Number,
        birthYear: Number
      },
      workoutPreferences: {
        location: String,
        frequencyPerWeek: Number,
        specificDays: [String],
        injuries: [String]
      },
      fitnessAssessment: {
        fitnessLevel: String,
        cardioTest: String,
        flexibilityTest: String,
        rewardPreference: String,
        targetMood: String
      }
    },

    plan: PlanPayloadSchema,

    meta: {
      startDate: { type: Date },
      timezone: { type: String, default: 'Europe/Istanbul' },
      locale: { type: String, default: 'tr-TR' }
    }
  },
  { timestamps: true }
);

PlanSchema.index({ createdAt: -1 });
PlanSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Plan', PlanSchema);
