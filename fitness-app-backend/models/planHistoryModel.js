// models/planHistoryModel.js
const mongoose = require('mongoose');

const ExerciseSchema = new mongoose.Schema(
  { name: String, sets: Number, reps: Number, rest: String },
  { _id: false }
);

const DaySchema = new mongoose.Schema(
  { dayName: String, phase: String, exercises: [ExerciseSchema] },
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
    motivation: {
      messages: [String]
    },
    milestones: [MilestoneSchema]
  },
  { _id: false }
);

const UserProfileSchema = new mongoose.Schema(
  {
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
  { _id: false }
);

const PlanHistorySchema = new mongoose.Schema(
  {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },
    userId: { type: String, required: true, index: true },

    // Snapshot of the plan at that time
    snapshot: {
      userProfile: UserProfileSchema,
      plan: PlanPayloadSchema
    },

    // Why this snapshot was created
    reason: {
      type: String,
      enum: ['created', 'updated_prev', 'updated', 'reverted', 'deleted'],
      required: true
    }
  },
  { timestamps: true }
);

// helpful indexes
PlanHistorySchema.index({ planId: 1, createdAt: -1 });

module.exports = mongoose.model('PlanHistory', PlanHistorySchema);
