// models/workoutLogModel.js
const mongoose = require('mongoose');

const PerformedSetSchema = new mongoose.Schema(
  {
    reps: { type: Number, min: 0 },
    weightKg: { type: Number, min: 0 },
    rpe: { type: Number, min: 0, max: 10 },
    success: { type: Boolean, default: true },
    notes: { type: String, default: '' }
  },
  { _id: false }
);

const LoggedExerciseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    // hedefler (plandan gelen)
    targetSets: { type: Number, min: 0 },
    targetReps: { type: Number, min: 0 },
    targetRest: { type: String, default: '' },

    // yapılanlar
    performedSets: { type: [PerformedSetSchema], default: [] }
  },
  { _id: false }
);

const WorkoutLogSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true, index: true },

    // tarih ve plan bağlamı
    date: { type: Date, required: true, index: true },   // kaydın günü (UTC Date)
    timezone: { type: String, default: 'Europe/Istanbul' },
    week: { type: Number, required: true },              // planın kaçıncı haftası
    dayIso: { type: Number, min: 1, max: 7, required: true }, // 1..7 (Mon..Sun)
    dayName: { type: String, required: true },           // örn. "Wednesday"

    // içerik
    completed: { type: Boolean, default: false },
    exercises: { type: [LoggedExerciseSchema], default: [] },

    // serbest alanlar
    notes: { type: String, default: '' }
  },
  { timestamps: true }
);

// Her kullanıcı/plan için günde tek log tutmak adına unique index
WorkoutLogSchema.index({ userId: 1, planId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WorkoutLog', WorkoutLogSchema);
