// services/progressionService.js

/**
 * Bölüm A — ANALİZ (var olan mantığın aynısı + küçük rötuşlar)
 * - buildProgressionSuggestions(logs, injuries): egzersiz bazlı öneriler üretir
 * Bölüm B — UYGULAMA
 * - applySuggestionToPlan(planDoc, payload): belirli hafta/gün/egzersizde set/rep/dinlenme/varyasyon günceller
 * - applyMultipleSuggestions(planDoc, edits): birden fazla düzenlemeyi tek seferde yapar
 */

//
// ───────────────────────────────── ANALİZ ──────────────────────────────────────
//

function mean(arr) {
  if (!arr || !arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function lastN(arr, n) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(-n);
}

function flatReps(performedSets) {
  if (!Array.isArray(performedSets)) return [];
  return performedSets.map((s) => (typeof s.reps === 'number' ? s.reps : 0));
}

function completionRatio(performedSets, targetSets, targetReps) {
  if (!Array.isArray(performedSets) || !targetSets || !targetReps) return 0;
  const target = targetSets * targetReps;
  const done = performedSets.reduce((sum, s) => sum + (s.reps || 0), 0);
  if (!target) return 0;
  return Math.min(1, done / target);
}

function failureRate(performedSets) {
  if (!Array.isArray(performedSets) || performedSets.length === 0) return 0;
  const fails = performedSets.filter((s) => s.success === false).length;
  return fails / performedSets.length;
}

function avgRPE(performedSets) {
  const rpes = (performedSets || [])
    .map((s) => (typeof s.rpe === 'number' ? s.rpe : null))
    .filter((x) => x !== null);
  return mean(rpes);
}

// Riskli hareket anahtar kelimeleri
const INJURY_FLAGS = {
  shoulder: ['overhead press', 'weighted dips', 'ring dips', 'russian dips', 'push-up'],
  knee: ['squat', 'jump', 'lunge', 'step-up', 'broad jump', 'depth jump', 'sprint'],
  lower_back: ['deadlift', 'good morning', 'back extension', 'dragon flag']
};

function nameMatchesAny(name, keywords) {
  const n = (name || '').toLowerCase();
  return keywords.some((k) => n.includes(k));
}

function injurySensitive(exName, injuries) {
  if (!injuries || !injuries.length) return false;
  const lowerInj = injuries.map((i) => String(i).toLowerCase());
  for (const inj of lowerInj) {
    const keys = INJURY_FLAGS[inj] || [];
    if (nameMatchesAny(exName, keys)) return inj;
  }
  return false;
}

function analyzeExerciseSeries(series, injuries) {
  series.sort((a, b) => new Date(a.date) - new Date(b.date));
  const recent = lastN(series, 3);

  const perSetMeans = recent.map((s) => mean(flatReps(s.performedSets)));
  const avgPerSetReps = mean(perSetMeans);
  const compRatios = recent.map((s) => completionRatio(s.performedSets, s.targetSets, s.targetReps));
  const avgCompletion = mean(compRatios);
  const failRates = recent.map((s) => failureRate(s.performedSets));
  const avgFail = mean(failRates);
  const rpes = recent.map((s) => avgRPE(s.performedSets)).filter((x) => x > 0);
  const avgSessionRPE = mean(rpes);

  let trend = 'flat';
  if (perSetMeans.length >= 2) {
    const last = perSetMeans[perSetMeans.length - 1];
    const prev = perSetMeans[perSetMeans.length - 2];
    if (last - prev > 0.75) trend = 'up';
    else if (prev - last > 0.75) trend = 'down';
  }

  const recs = [];
  const rationale = [];

  const inj = injurySensitive(series[series.length - 1]?.name || '', injuries);
  if (inj) {
    recs.push('consider_safer_variation');
    rationale.push(`Sensitive for ${inj}; consider safer variation or ROM limits.`);
  }

  if (avgFail >= 0.3) {
    recs.push('reduce_reps_or_increase_rest');
    rationale.push('High failure rate (≥30%). Reduce target reps by 1–2 or add 15–30s rest.');
  }

  if (avgCompletion >= 0.95 && trend === 'up' && avgSessionRPE <= 7.5) {
    recs.push('add_reps');
    rationale.push('Strong completion, reps trending up, perceived effort moderate. Add +1–2 reps per set.');
  } else if (avgCompletion >= 0.95 && trend === 'flat') {
    recs.push('add_set_optional');
    rationale.push('High completion but flat progress. Consider +1 set if recovery allows.');
  }

  if (avgSessionRPE >= 9 && avgFail > 0) {
    recs.push('add_rest_time');
    rationale.push('Very high RPE with failures. Increase rest by +30s or simplify tempo.');
  }

  if (!recs.length) {
    recs.push('keep_as_is');
    rationale.push('Stable performance. Keep the current prescription.');
  }

  return {
    metrics: {
      avgPerSetReps: Number(avgPerSetReps.toFixed(2)),
      avgCompletion: Number((avgCompletion * 100).toFixed(1)),
      avgFailureRate: Number((avgFail * 100).toFixed(1)),
      avgSessionRPE: Number((avgSessionRPE || 0).toFixed(1)),
      trend
    },
    recommendations: recs,
    rationale
  };
}

function buildExercisesLogMap(logs) {
  const map = new Map();
  logs.forEach((l) => {
    (l.exercises || []).forEach((ex) => {
      const key = (ex.name || '').trim();
      if (!key) return;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({
        name: ex.name,
        date: l.date,
        targetSets: ex.targetSets || 0,
        targetReps: ex.targetReps || 0,
        performedSets: ex.performedSets || []
      });
    });
  });
  return map;
}

function buildProgressionSuggestions(logs, injuries = []) {
  if (!Array.isArray(logs) || !logs.length) return [];
  logs.sort((a, b) => new Date(a.date) - new Date(b.date));
  const map = buildExercisesLogMap(logs);
  const out = [];

  for (const [name, series] of map.entries()) {
    const analysis = analyzeExerciseSeries(series, injuries);
    out.push({ exercise: name, analysis });
  }

  out.sort((a, b) => {
    const prio = (it) => {
      const r = it.analysis.recommendations;
      if (r.includes('reduce_reps_or_increase_rest')) return 0;
      if (r.includes('consider_safer_variation')) return 1;
      if (r.includes('add_reps')) return 2;
      if (r.includes('add_set_optional')) return 3;
      return 4;
    };
    return prio(a) - prio(b);
  });

  return out;
}

//
// ──────────────────────────────── UYGULAMA ─────────────────────────────────────
//

function safeNumber(n, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

function findWeekBlock(planDoc, weekNumber) {
  const weeksArr = Array.isArray(planDoc?.plan?.weeks) ? planDoc.plan.weeks : [];
  return weeksArr.find((w) => w.week === weekNumber) || null;
}

function normalizeName(s) {
  return String(s || '').trim().toLowerCase();
}

/**
 * dayRef aşağıdakilerden biri olabilir:
 *  - { dayName: 'Wednesday' }  (case-insensitive)
 *  - { dayIndex: 0 }           (hafta içindeki sıra)
 *  - { dayIso: 1..7 }          (Monday=1 ... Sunday=7) — sadece isim eşleşmesi için kullanılır
 */
function resolveDayBlock(weekBlock, dayRef) {
  if (!weekBlock || !Array.isArray(weekBlock.days)) return { dayBlock: null, dayIndex: -1 };

  const days = weekBlock.days;
  // 1) dayName
  if (dayRef && typeof dayRef.dayName === 'string') {
    const targetLc = normalizeName(dayRef.dayName);
    const idx = days.findIndex((d) => normalizeName(d.dayName) === targetLc);
    if (idx !== -1) return { dayBlock: days[idx], dayIndex: idx };
  }

  // 2) dayIndex
  if (dayRef && Number.isInteger(dayRef.dayIndex) && dayRef.dayIndex >= 0 && dayRef.dayIndex < days.length) {
    return { dayBlock: days[dayRef.dayIndex], dayIndex: dayRef.dayIndex };
  }

  // 3) dayIso -> dayName (EN) ile kıyas (plan günleri EN uzun formatta oluşturuluyor)
  if (dayRef && Number.isInteger(dayRef.dayIso) && dayRef.dayIso >= 1 && dayRef.dayIso <= 7) {
    const EN_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const name = EN_LONG[dayRef.dayIso - 1];
    const targetLc = normalizeName(name);
    const idx = days.findIndex((d) => normalizeName(d.dayName) === targetLc);
    if (idx !== -1) return { dayBlock: days[idx], dayIndex: idx };
  }

  return { dayBlock: null, dayIndex: -1 };
}

function findExerciseIndex(dayBlock, exerciseName) {
  if (!dayBlock || !Array.isArray(dayBlock.exercises)) return -1;
  const targetLc = normalizeName(exerciseName);
  return dayBlock.exercises.findIndex((e) => normalizeName(e.name) === targetLc);
}

/**
 * Tek bir düzenlemeyi uygular veya önizler.
 * edit şekli:
 * {
 *   week: 3,                                   // zorunlu
 *   day: { dayName: "Wednesday" } | { dayIndex: 1 } | { dayIso: 3 },  // zorunlu
 *   exercise: "Barbell bench press",           // zorunlu
 *   setsDelta: 1,                              // opsiyonel (+/-)
 *   repsDelta: 2,                              // opsiyonel (+/-)
 *   restDeltaSec: 30,                          // opsiyonel (+/-); '60s' -> saniyeye çevrilir -> +30s -> '90s'
 *   replaceName: "Incline barbell press"       // opsiyonel (varyasyon değişimi)
 * }
 *
 * return: { ok, message, diff }
 */
function applySuggestionToPlan(planDoc, edit, { preview = false } = {}) {
  if (!planDoc || !planDoc.plan) {
    return { ok: false, message: 'Invalid planDoc', diff: null };
  }
  if (!edit || !Number.isInteger(edit.week) || !edit.day || !edit.exercise) {
    return { ok: false, message: 'Missing required fields (week/day/exercise)', diff: null };
  }

  const weekBlock = findWeekBlock(planDoc, edit.week);
  if (!weekBlock) return { ok: false, message: `Week ${edit.week} not found`, diff: null };

  const { dayBlock, dayIndex } = resolveDayBlock(weekBlock, edit.day);
  if (!dayBlock) return { ok: false, message: 'Day not found in the specified week', diff: null };

  const exIdx = findExerciseIndex(dayBlock, edit.exercise);
  if (exIdx === -1) return { ok: false, message: `Exercise "${edit.exercise}" not found in that day`, diff: null };

  const original = dayBlock.exercises[exIdx];
  const newObj = { ...original };

  // sets
  if (typeof edit.setsDelta === 'number' && edit.setsDelta !== 0) {
    const before = safeNumber(newObj.sets, 0);
    newObj.sets = Math.max(1, before + edit.setsDelta);
  }

  // reps
  if (typeof edit.repsDelta === 'number' && edit.repsDelta !== 0) {
    const before = safeNumber(newObj.reps, 0);
    newObj.reps = Math.max(1, before + edit.repsDelta);
  }

  // rest (string "60s" formatını saniyeye çevir, delta uygula, tekrar "Xs")
  if (typeof edit.restDeltaSec === 'number' && edit.restDeltaSec !== 0) {
    const restStr = String(newObj.rest || '60s').trim().toLowerCase(); // '90s'
    const base = parseInt(restStr.replace('s', ''), 10);
    const after = Math.max(15, safeNumber(base, 60) + edit.restDeltaSec);
    newObj.rest = `${after}s`;
  }

  // varyasyon değişimi
  if (edit.replaceName && typeof edit.replaceName === 'string' && edit.replaceName.trim()) {
    newObj.name = edit.replaceName.trim();
  }

  const diff = {
    week: edit.week,
    dayIndex,
    dayName: dayBlock.dayName,
    exerciseBefore: { ...original },
    exerciseAfter: { ...newObj }
  };

  if (!preview) {
    // kalıcı uygula
    planDoc.plan.weeks
      .find((w) => w.week === edit.week)
      .days[dayIndex]
      .exercises[exIdx] = newObj;
  }

  return { ok: true, message: preview ? 'preview only' : 'applied', diff };
}

/**
 * Birden fazla düzenlemeyi sırasıyla uygular. Biri bile başarısızsa tüm değişiklikleri geri al (atomic simülasyon).
 * Not: Bu işlev, Mongoose doc üzerinde memory’de değiştirir; kaydetmeyi controller yapar.
 */
function applyMultipleSuggestions(planDoc, edits, { preview = false } = {}) {
  if (!Array.isArray(edits) || !edits.length) {
    return { ok: false, message: 'No edits provided', results: [] };
  }

  // JSON snapshot (rollback için)
  const snapshot = preview ? null : JSON.parse(JSON.stringify(planDoc.plan));

  const results = [];
  for (const e of edits) {
    const r = applySuggestionToPlan(planDoc, e, { preview });
    results.push(r);
    if (!r.ok && !preview) {
      // rollback
      planDoc.plan = snapshot;
      return { ok: false, message: `Failed at one of the edits: ${r.message}`, results };
    }
  }

  return { ok: true, message: preview ? 'preview batch' : 'applied batch', results };
}

module.exports = {
  // analiz
  buildProgressionSuggestions,
  // uygulama
  applySuggestionToPlan,
  applyMultipleSuggestions
};
