// services/nutritionService.js

exports.calculateNutritionPlan = (userProfile) => {
  const { gender, mainGoal } = userProfile.basicInfo;
  const { heightCm, currentWeightKg, birthYear } = userProfile.physicalMetrics;
  const { frequencyPerWeek } = userProfile.workoutPreferences;

  const age = new Date().getFullYear() - birthYear;

  // --- 1) BMR (Harris–Benedict) ---
  let bmr;
  if (gender.toLowerCase() === 'male') {
    bmr = 88.362 + (13.397 * currentWeightKg) + (4.799 * heightCm) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * currentWeightKg) + (3.098 * heightCm) - (4.330 * age);
  }

  // --- 2) Activity factor (simplified mapping from frequency) ---
  const activityFactorMap = {
    3: 1.375, // light activity
    5: 1.55,  // moderate activity
    7: 1.725  // very active
  };
  const activityFactor = activityFactorMap[frequencyPerWeek] || 1.375;

  // --- 3) TDEE ---
  const tdee = bmr * activityFactor;

  // --- 4) Calorie target by goal ---
  let calorieTarget = tdee;
  if (mainGoal === 'weight_loss') {
    calorieTarget = tdee - 500; // ~0.5 kg/week loss
  } else if (mainGoal === 'muscle_gain') {
    calorieTarget = tdee + 300; // lean gain
  }

  // --- 5) Macro breakdown ---
  // Protein: 1.8g/kg, Fat: 25% of total cals, Carbs: remainder
  const proteinGrams = Math.round(currentWeightKg * 1.8);
  const proteinCals = proteinGrams * 4;

  const fatCals = calorieTarget * 0.25;
  const fatGrams = Math.round(fatCals / 9);

  const carbCals = calorieTarget - (proteinCals + fatCals);
  const carbGrams = Math.round(carbCals / 4);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieTarget: Math.round(calorieTarget),
    macros: {
      protein_g: proteinGrams,
      fat_g: fatGrams,
      carbs_g: carbGrams
    }
  };
};
