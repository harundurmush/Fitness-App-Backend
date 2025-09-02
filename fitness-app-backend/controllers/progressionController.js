// controllers/progressionController.js
const Plan = require('../models/planModel');
const WorkoutLog = require('../models/workoutLogModel');
const { buildProgressionSuggestions } = require('../services/progressionService');
const { applyProgressionSuggestion } = require('../services/progressionApplyService');

function getUserId(req) {
  return (
    req.header('x-user-id') ||
    (req.body && req.body.userId) ||
    (req.query && req.query.userId) ||
    null
  );
}

/**
 * GET /api/logs/progression?planId=...&lookbackDays=21&minSessions=3
 */
exports.getProgression = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId is required (x-user-id header or ?userId=...)' });

    const { planId } = req.query;
    if (!planId) return res.status(400).json({ error: 'planId is required' });

    const lookbackDays = Math.max(parseInt(req.query.lookbackDays || '21', 10), 7);
    const minSessions = Math.max(parseInt(req.query.minSessions || '3', 10), 2);

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.userId !== userId) return res.status(403).json({ error: 'Forbidden: plan does not belong to you' });

    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const logs = await WorkoutLog.find({
      userId,
      planId,
      date: { $gte: new Date(new Date(since).setUTCHours(0,0,0,0)) }
    }).sort({ date: 1 });

    if (!logs.length || logs.length < minSessions) {
      return res.status(200).json({
        message: `Not enough data for progression (need ≥ ${minSessions} sessions, have ${logs.length}).`,
        items: []
      });
    }

    const injuries = plan.userProfile?.workoutPreferences?.injuries || [];
    const items = buildProgressionSuggestions(logs, injuries);

    return res.status(200).json({
      planId,
      lookbackDays,
      sessionsAnalyzed: logs.length,
      items
    });
  } catch (err) {
    console.error('getProgression error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/logs/progression/apply
 * Body:
 * {
 *   "planId": "...",
 *   "exerciseName": "Standard push-ups",
 *   "action": "add_reps", // or add_set_optional | reduce_reps_or_increase_rest | add_rest_time | consider_safer_variation
 *   "applyTo": "next_occurrence", // or "all_upcoming_week" | "all_upcoming"
 *   "repsDelta": 1,
 *   "setsDelta": 1,
 *   "restDeltaSeconds": 30,
 *   "newName": "Incline push-ups",   // only for consider_safer_variation
 *   "startWeek": 4                   // optional
 * }
 */
exports.applyProgression = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId is required (x-user-id header or ?userId=...)' });

    const {
      planId,
      exerciseName,
      action,
      applyTo,
      repsDelta,
      setsDelta,
      restDeltaSeconds,
      newName,
      startWeek
    } = req.body || {};

    if (!planId) return res.status(400).json({ error: 'planId is required' });
    if (!exerciseName || !action) {
      return res.status(400).json({ error: 'exerciseName and action are required' });
    }

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.userId !== userId) return res.status(403).json({ error: 'Forbidden: plan does not belong to you' });

    const { modified, count, appliedTo } = applyProgressionSuggestion(plan, {
      exerciseName,
      action,
      applyTo,
      repsDelta,
      setsDelta,
      restDeltaSeconds,
      newName,
      startWeek
    });

    if (!modified) {
      return res.status(200).json({ message: 'No matching exercise found or nothing changed.', appliedTo, count: 0 });
    }

    await plan.save();

    return res.status(200).json({
      message: 'Progression applied',
      appliedTo,
      changedExercises: count,
      planId: plan._id
    });
  } catch (err) {
    console.error('applyProgression error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
