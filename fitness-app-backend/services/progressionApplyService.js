// services/progressionApplyService.js

/**
 * Progression suggestions apply helper
 * Supported actions:
 *  - 'add_reps'                      -> +1–2 reps per set (default +1)
 *  - 'add_set_optional'              -> +1 set
 *  - 'reduce_reps_or_increase_rest'  -> -1 rep (min 5) OR +15s rest
 *  - 'add_rest_time'                 -> +30s rest
 *  - 'consider_safer_variation'      -> replace by provided 'newName' if present
 *
 * Payload example:
 * {
 *   planId: "...",
 *   exerciseName: "Standard push-ups",
 *   action: "add_reps",
 *   repsDelta: 1,            // optional
 *   setsDelta: 1,            // optional
 *   restDeltaSeconds: 30,    // optional
 *   newName: "Incline push-ups", // optional for safer variation
 *   applyTo: "next_occurrence" | "all_upcoming_week" | "all_upcoming",
 *   startWeek: 1             // optional override
 * }
 */

function parseRestToSeconds(restStr) {
  if (!restStr) return 60;
  const m = String(restStr).trim().match(/^(\d+)\s*s$/i);
  return m ? parseInt(m[1], 10) : 60;
}

function secondsToRestStr(sec) {
  const s = Math.max(0, parseInt(sec, 10) || 0);
  return `${s}s`;
}

function applyToExerciseObj(ex, payload) {
  const { action, repsDelta, setsDelta, restDeltaSeconds, newName } = payload;

  if (action === 'consider_safer_variation' && newName) {
    ex.name = newName;
    return;
  }

  if (action === 'add_reps') {
    const delta = typeof repsDelta === 'number' ? repsDelta : 1;
    ex.reps = Math.max(1, (ex.reps || 10) + delta);
    return;
  }

  if (action === 'add_set_optional') {
    const delta = typeof setsDelta === 'number' ? setsDelta : 1;
    ex.sets = Math.max(1, (ex.sets || 3) + delta);
    return;
  }

  if (action === 'reduce_reps_or_increase_rest') {
    // Önce rep azaltmayı dener, alt sınır 5; olmazsa +15s rest
    if ((ex.reps || 10) > 5) {
      ex.reps = Math.max(5, (ex.reps || 10) - (typeof repsDelta === 'number' ? Math.abs(repsDelta) : 1));
    } else {
      const cur = parseRestToSeconds(ex.rest || '60s');
      const add = typeof restDeltaSeconds === 'number' ? restDeltaSeconds : 15;
      ex.rest = secondsToRestStr(cur + add);
    }
    return;
  }

  if (action === 'add_rest_time') {
    const cur = parseRestToSeconds(ex.rest || '60s');
    const add = typeof restDeltaSeconds === 'number' ? restDeltaSeconds : 30;
    ex.rest = secondsToRestStr(cur + add);
    return;
  }
}

/**
 * @param {Document} planDoc - Mongoose Plan doc (mutable)
 * @param {Object} payload   - see example above
 * @returns {{modified:boolean, count:number, appliedTo:string}}
 */
function applyProgressionSuggestion(planDoc, payload) {
  if (!planDoc || !planDoc.plan || !Array.isArray(planDoc.plan.weeks)) {
    return { modified: false, count: 0, appliedTo: 'none' };
  }

  const {
    exerciseName,
    action,
    applyTo = 'next_occurrence', // 'next_occurrence' | 'all_upcoming_week' | 'all_upcoming'
    startWeek
  } = payload;

  if (!exerciseName || !action) {
    return { modified: false, count: 0, appliedTo: 'invalid_payload' };
  }

  const totalWeeks = planDoc.plan.totalWeeks || planDoc.plan.weeks.length || 0;
  let weekStart = 1;
  if (typeof startWeek === 'number' && startWeek >= 1 && startWeek <= totalWeeks) {
    weekStart = startWeek;
  } else {
    // Heuristik: şimdi hangi haftadaysak oradan başlatmak istersin; plan meta yoksa 1
    weekStart = 1;
  }

  let modified = false;
  let changedCount = 0;

  // iterate through weeks from weekStart..end
  for (const w of planDoc.plan.weeks) {
    if (!w || typeof w.week !== 'number' || w.week < weekStart) continue;

    // stop conditions for next_occurrence / all_upcoming_week
    let weekChanged = false;

    for (const day of (w.days || [])) {
      for (const ex of (day.exercises || [])) {
        if (String(ex.name || '').toLowerCase() === String(exerciseName).toLowerCase()) {
          applyToExerciseObj(ex, payload);
          changedCount += 1;
          modified = true;
          weekChanged = true;

          if (applyTo === 'next_occurrence') {
            return { modified, count: changedCount, appliedTo: 'next_occurrence' };
          }
        }
      }
    }

    if (applyTo === 'all_upcoming_week' && weekChanged) {
      // yalnızca bu hafta uygulayıp çık
      return { modified, count: changedCount, appliedTo: 'all_upcoming_week' };
    }
  }

  return { modified, count: changedCount, appliedTo: applyTo };
}

module.exports = {
  applyProgressionSuggestion
};
