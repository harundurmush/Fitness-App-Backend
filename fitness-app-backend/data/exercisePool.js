// data/exercisePool.js
module.exports = {
  home: [
    { name: "Push-ups", muscleGroup: "chest", type: "bodyweight" },
    { name: "Chair Dips", muscleGroup: "triceps", type: "bodyweight" },
    { name: "Squats", muscleGroup: "legs", type: "bodyweight" },
    { name: "Wall Sit", muscleGroup: "legs", type: "static" },
    { name: "Towel Rows", muscleGroup: "back", type: "bodyweight" },
    { name: "Plank", muscleGroup: "core", type: "static" }
  ],
  gym: [
    { name: "Bench Press", muscleGroup: "chest", type: "machine/barbell" },
    { name: "Lat Pulldown", muscleGroup: "back", type: "machine" },
    { name: "Leg Press", muscleGroup: "legs", type: "machine" },
    { name: "Cable Rows", muscleGroup: "back", type: "machine" },
    { name: "Bicep Curls", muscleGroup: "biceps", type: "dumbbell" },
    { name: "Overhead Press", muscleGroup: "shoulders", type: "barbell/dumbbell" }
  ],
  outdoor: [
    { name: "Jump Rope", muscleGroup: "full_body", type: "cardio" },
    { name: "Sprints", muscleGroup: "legs", type: "cardio" },
    { name: "Pull-ups (Bar)", muscleGroup: "back", type: "bodyweight" },
    { name: "Step-ups (Bench/Park)", muscleGroup: "legs", type: "bodyweight" },
    { name: "Mountain Climbers", muscleGroup: "core", type: "cardio" }
  ]
};