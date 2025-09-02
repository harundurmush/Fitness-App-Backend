// controllers/planController.js

const { calculatePlanDuration, buildPersonalPlan } = require('../services/planService');
const { calculateNutritionPlan } = require('../services/nutritionService');
const { buildMotivation } = require('../services/motivationService');
const { buildMilestones } = require('../services/milestoneService');
const { computeTodayView } = require('../services/scheduleService'); // NEW
const Plan = require('../models/planModel');
const PlanHistory = require('../models/planHistoryModel');

// -------- Validation helpers (detailed) --------
const ENUMS = {
  mainGoal: ['weight_loss', 'muscle_gain', 'maintenance'],
  location: ['home', 'gym', 'outdoor'],
  frequency: [3, 5, 7],
  fitnessLevel: ['beginner', 'intermediate', 'advanced'],
  cardioTest: ['out_of_breath', 'slightly_out_of_breath', 'comfortable'],
  flexibilityTest: ['far', 'close', 'touch_easily'],
  injuries: ['knee', 'shoulder', 'lower_back', 'wrist', 'ankle']
};

function numberInRange(n, min, max) {
  return typeof n === 'number' && isFinite(n) && n >= min && n <= max;
}

function validateUserProfileDetailed(profile) {
  const errors = [];

  if (!profile || typeof profile !== 'object') {
    return ['Profile data is missing'];
  }

  if (!profile.basicInfo) errors.push('basicInfo section is missing');

  if (profile.basicInfo) {
    const { gender, mainGoal, focusArea } = profile.basicInfo;
    if (!gender || typeof gender !== 'string') errors.push('basicInfo.gender is required and should be a string');
    if (!mainGoal || !ENUMS.mainGoal.includes(mainGoal))
      errors.push(`basicInfo.mainGoal must be one of ${ENUMS.mainGoal.join(', ')}`);
    if (!focusArea || typeof focusArea !== 'string') errors.push('basicInfo.focusArea is required and should be a string');
  }

  if (!profile.physicalMetrics) errors.push('physicalMetrics section is missing');

  if (profile.physicalMetrics) {
    const { heightCm, currentWeightKg, targetWeightKg, birthYear } = profile.physicalMetrics;

    if (typeof heightCm !== 'number') errors.push('physicalMetrics.heightCm must be a number');
    if (typeof currentWeightKg !== 'number') errors.push('physicalMetrics.currentWeightKg must be a number');
    if (typeof targetWeightKg !== 'number') errors.push('physicalMetrics.targetWeightKg must be a number');
    if (typeof birthYear !== 'number') errors.push('physicalMetrics.birthYear must be a number');

    if (!numberInRange(heightCm, 120, 230)) errors.push('physicalMetrics.heightCm should be in 120–230 cm');
    if (!numberInRange(currentWeightKg, 30, 300)) errors.push('physicalMetrics.currentWeightKg should be in 30–300 kg');
    if (!numberInRange(targetWeightKg, 30, 300)) errors.push('physicalMetrics.targetWeightKg should be in 30–300 kg');

    const currentYear = new Date().getFullYear();
    if (!numberInRange(birthYear, 1900, currentYear - 10))
      errors.push(`physicalMetrics.birthYear should be between 1900 and ${currentYear - 10}`);

    if (typeof currentWeightKg === 'number' && typeof targetWeightKg === 'number' && currentWeightKg === targetWeightKg) {
      errors.push('physicalMetrics.targetWeightKg must be different than currentWeightKg');
    }
  }

  if (!profile.workoutPreferences) errors.push('workoutPreferences section is missing');

  if (profile.workoutPreferences) {
    const { location, frequencyPerWeek, injuries, specificDays } = profile.workoutPreferences;
    if (!location || !ENUMS.location.includes(location))
      errors.push(`workoutPreferences.location must be one of ${ENUMS.location.join(', ')}`);
    if (!ENUMS.frequency.includes(frequencyPerWeek))
      errors.push(`workoutPreferences.frequencyPerWeek must be one of ${ENUMS.frequency.join(', ')}`);
    if (!Array.isArray(injuries)) errors.push('workoutPreferences.injuries must be an array');
    if (Array.isArray(injuries)) {
      const invalid = injuries.filter((i) => !ENUMS.injuries.includes(i));
      if (invalid.length) errors.push(`workoutPreferences.injuries has invalid values: ${invalid.join(', ')}`);
    }
    if (specificDays && !Array.isArray(specificDays)) {
      errors.push('workoutPreferences.specificDays must be an array if provided');
    }
  }

  if (!profile.fitnessAssessment) errors.push('fitnessAssessment section is missing');

  if (profile.fitnessAssessment) {
    const { fitnessLevel, cardioTest, flexibilityTest } = profile.fitnessAssessment;
    if (!ENUMS.fitnessLevel.includes(fitnessLevel))
      errors.push(`fitnessAssessment.fitnessLevel must be one of ${ENUMS.fitnessLevel.join(', ')}`);
    if (cardioTest && !ENUMS.cardioTest.includes(cardioTest))
      errors.push(`fitnessAssessment.cardioTest must be one of ${ENUMS.cardioTest.join(', ')}`);
    if (flexibilityTest && !ENUMS.flexibilityTest.includes(flexibilityTest))
      errors.push(`fitnessAssessment.flexibilityTest must be one of ${ENUMS.flexibilityTest.join(', ')}`);
  }

  return errors;
}

function validateUserProfile(profile) {
  const errs = validateUserProfileDetailed(profile);
  return errs.length ? errs[0] : null;
}

function getUserId(req) {
  return (
    req.header('x-user-id') ||
    (req.body && req.body.userId) ||
    (req.query && req.query.userId) ||
    null
  );
}

async function writeHistory({ planDoc, reason }) {
  if (!planDoc) return;
  const PlanHistory = require('../models/planHistoryModel');
  await PlanHistory.create({
    planId: planDoc._id,
    userId: planDoc.userId,
    reason,
    snapshot: {
      userProfile: planDoc.userProfile,
      plan: planDoc.plan
    }
  });
}

// --- Only compute plan, don't save
exports.generatePlan = (req, res) => {
  try {
    const userProfile = req.body;
    const errors = validateUserProfileDetailed(userProfile);
    if (errors.length) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    const computedWeeks = calculatePlanDuration(
      userProfile.physicalMetrics.currentWeightKg,
      userProfile.physicalMetrics.targetWeightKg,
      userProfile.workoutPreferences.frequencyPerWeek,
      userProfile.basicInfo.mainGoal
    );

    const totalWeeks = Math.max(4, Math.min(16, computedWeeks || 8));

    const workoutPlan = buildPersonalPlan(userProfile, totalWeeks);
    const nutritionPlan = calculateNutritionPlan(userProfile);
    const motivation = buildMotivation(userProfile, totalWeeks);
    const milestones = buildMilestones(userProfile, totalWeeks);

    return res.status(200).json({
      ...workoutPlan,
      nutrition: nutritionPlan,
      motivation: { messages: motivation },
      milestones
    });
  } catch (err) {
    console.error('generatePlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Compute plan and SAVE to DB (requires userId)
exports.savePlan = async (req, res) => {
  try {
    const userProfile = req.body;

    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'userId is required (send "x-user-id" header or include in body)' });
    }

    const errors = validateUserProfileDetailed(userProfile);
    if (errors.length) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    const computedWeeks = calculatePlanDuration(
      userProfile.physicalMetrics.currentWeightKg,
      userProfile.physicalMetrics.targetWeightKg,
      userProfile.workoutPreferences.frequencyPerWeek,
      userProfile.basicInfo.mainGoal
    );
    const totalWeeks = Math.max(4, Math.min(16, computedWeeks || 8));

    const workoutPlan = buildPersonalPlan(userProfile, totalWeeks);
    const nutritionPlan = calculateNutritionPlan(userProfile);
    const motivation = buildMotivation(userProfile, totalWeeks);
    const milestones = buildMilestones(userProfile, totalWeeks);

    // NEW: startDate & timezone (optional from body.query), else defaults
    const startDateISO = req.query.startDate || req.body.startDate || null;
    const timezone = req.query.timezone || req.body.timezone || 'Europe/Istanbul';
    const startDate = startDateISO ? new Date(startDateISO) : new Date(); // now

    const doc = await Plan.create({
      userId,
      userProfile,
      plan: {
        ...workoutPlan,
        nutrition: nutritionPlan,
        motivation: { messages: motivation },
        milestones
      },
      meta: {
        startDate,
        timezone
      }
    });

    await writeHistory({ planDoc: doc, reason: 'created' });

    return res.status(201).json({
      id: doc._id,
      userId: doc.userId,
      createdAt: doc.createdAt,
      message: 'Plan saved successfully',
      planSummary: {
        totalWeeks: workoutPlan.totalWeeks,
        phases: workoutPlan.progression.length,
        hasNutrition: true,
        hasMotivation: true,
        milestones: milestones.length
      },
      meta: doc.meta
    });
  } catch (err) {
    console.error('savePlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ---- helpers for filtering & sorting ----
function buildPlansFilter(userId, q) {
  const filter = { userId };

  if (q.mainGoal && ENUMS.mainGoal.includes(q.mainGoal)) {
    filter['userProfile.basicInfo.mainGoal'] = q.mainGoal;
  }
  if (q.focusArea) {
    filter['userProfile.basicInfo.focusArea'] = q.focusArea;
  }

  if (q.location && ENUMS.location.includes(q.location)) {
    filter['userProfile.workoutPreferences.location'] = q.location;
  }
  if (q.frequencyPerWeek && ENUMS.frequency.includes(Number(q.frequencyPerWeek))) {
    filter['userProfile.workoutPreferences.frequencyPerWeek'] = Number(q.frequencyPerWeek);
  }

  if (q.fitnessLevel && ENUMS.fitnessLevel.includes(q.fitnessLevel)) {
    filter['userProfile.fitnessAssessment.fitnessLevel'] = q.fitnessLevel;
  }

  const from = q.dateFrom ? new Date(q.dateFrom) : null;
  const to = q.dateTo ? new Date(q.dateTo) : null;
  if (from || to) {
    filter.createdAt = {};
    if (from && !isNaN(from)) filter.createdAt.$gte = from;
    if (to && !isNaN(to)) {
      const end = new Date(to);
      if (q.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(q.dateTo)) end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  return filter;
}

function parseSort(sortStr) {
  const whitelist = new Set(['createdAt', 'updatedAt']);
  let sort = { createdAt: -1 };
  if (!sortStr || typeof sortStr !== 'string') return sort;
  const [field, dirRaw] = sortStr.split(':').map((s) => (s || '').trim());
  if (!whitelist.has(field)) return sort;
  const dir = (dirRaw || 'desc').toLowerCase();
  return { [field]: dir === 'asc' ? 1 : -1 };
}

// --- List saved plans
exports.getPlans = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res
        .status(400)
        .json({ error: 'userId is required to list your plans (send "x-user-id" header or ?userId=...)' });
    }

    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    const filter = buildPlansFilter(userId, req.query);
    const sort = parseSort(req.query.sort);

    const projection = {
      'userProfile.basicInfo': 1,
      'userProfile.workoutPreferences.location': 1,
      'userProfile.fitnessAssessment.fitnessLevel': 1,
      createdAt: 1,
      updatedAt: 1,
      userId: 1
    };

    const [items, total] = await Promise.all([
      Plan.find(filter, projection).sort(sort).skip(skip).limit(limit),
      Plan.countDocuments(filter)
    ]);

    return res.status(200).json({
      page,
      limit,
      total,
      sort,
      appliedFilter: filter,
      items
    });
  } catch (err) {
    console.error('getPlans error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Get single plan by id — optional ownership check
exports.getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);

    const plan = await Plan.findById(id);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    if (userId && plan.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: this plan does not belong to you' });
    }

    return res.status(200).json(plan);
  } catch (err) {
    console.error('getPlanById error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Get plan history
exports.getPlanHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'userId is required (header x-user-id or ?userId=...)' });
    }

    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const history = await PlanHistory.find({ planId: id }).sort({ createdAt: -1 });
    return res.status(200).json({ items: history });
  } catch (err) {
    console.error('getPlanHistory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Revert plan to a specific history snapshot
exports.revertPlanToHistory = async (req, res) => {
  try {
    const { id, historyId } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'userId is required (header x-user-id or ?userId=...)' });
    }

    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const hist = await PlanHistory.findOne({ _id: historyId, planId: id });
    if (!hist) return res.status(404).json({ error: 'History snapshot not found' });

    await writeHistory({ planDoc: plan, reason: 'updated_prev' });

    plan.userProfile = hist.snapshot.userProfile;
    plan.plan = hist.snapshot.plan;
    await plan.save();

    await writeHistory({ planDoc: plan, reason: 'reverted' });

    return res.status(200).json({
      id: plan._id,
      userId: plan.userId,
      updatedAt: plan.updatedAt,
      message: 'Plan reverted successfully'
    });
  } catch (err) {
    console.error('revertPlanToHistory error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Update plan (recompute on profile change)
exports.updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'userId is required (send "x-user-id" header or include in body)' });
    }

    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.userId !== userId) return res.status(403).json({ error: 'Forbidden: this plan does not belong to you' });

    const incomingProfile = req.body && req.body.userProfile ? req.body.userProfile : null;
    if (!incomingProfile) {
      return res.status(400).json({ error: 'userProfile is required in body to update and recompute the plan' });
    }

    const errors = validateUserProfileDetailed(incomingProfile);
    if (errors.length) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    await writeHistory({ planDoc: plan, reason: 'updated_prev' });

    const computedWeeks = calculatePlanDuration(
      incomingProfile.physicalMetrics.currentWeightKg,
      incomingProfile.physicalMetrics.targetWeightKg,
      incomingProfile.workoutPreferences.frequencyPerWeek,
      incomingProfile.basicInfo.mainGoal
    );
    const totalWeeks = Math.max(4, Math.min(16, computedWeeks || 8));

    const workoutPlan = buildPersonalPlan(incomingProfile, totalWeeks);
    const nutritionPlan = calculateNutritionPlan(incomingProfile);
    const motivation = buildMotivation(incomingProfile, totalWeeks);
    const milestones = buildMilestones(incomingProfile, totalWeeks);

    plan.userProfile = incomingProfile;
    plan.plan = {
      ...workoutPlan,
      nutrition: nutritionPlan,
      motivation: { messages: motivation },
      milestones
    };

    // OPTIONAL: meta.startDate değiştirilebilir — istersen:
    if (req.body.startDate) {
      plan.meta = plan.meta || {};
      plan.meta.startDate = new Date(req.body.startDate);
    }
    if (req.body.timezone) {
      plan.meta = plan.meta || {};
      plan.meta.timezone = req.body.timezone;
    }

    await plan.save();

    await writeHistory({ planDoc: plan, reason: 'updated' });

    return res.status(200).json({
      id: plan._id,
      userId: plan.userId,
      updatedAt: plan.updatedAt,
      message: 'Plan updated & recomputed successfully',
      planSummary: {
        totalWeeks: workoutPlan.totalWeeks,
        phases: workoutPlan.progression.length,
        hasNutrition: true,
        hasMotivation: true,
        milestones: milestones.length
      },
      meta: plan.meta
    });
  } catch (err) {
    console.error('updatePlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Delete plan
exports.deletePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'userId is required (send "x-user-id" header or include in query/body)' });
    }

    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.userId !== userId) return res.status(403).json({ error: 'Forbidden: this plan does not belong to you' });

    await writeHistory({ planDoc: plan, reason: 'deleted' });

    await Plan.deleteOne({ _id: id });

    return res.status(200).json({ message: 'Plan deleted successfully', id });
  } catch (err) {
    console.error('deletePlan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// --- TODAY VIEW: GET /api/plan/plans/:id/today?date=YYYY-MM-DD
exports.getTodayView = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: 'userId is required (header x-user-id or ?userId=...)' });
    }

    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.userId !== userId) return res.status(403).json({ error: 'Forbidden: this plan does not belong to you' });

    const dateStr = req.query.date; // optional
    const date = dateStr ? new Date(dateStr) : new Date();

    const view = computeTodayView(plan, date);
    return res.status(200).json(view);
  } catch (err) {
    console.error('getTodayView error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
