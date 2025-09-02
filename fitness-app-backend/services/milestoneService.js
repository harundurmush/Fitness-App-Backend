// services/milestoneService.js

/**
 * Build milestone objects for phase transitions and goal progress.
 * Output shape: [{ week, title, body, type }]
 * type: 'phase' | 'progress' | 'goal'
 */

function phaseForWeek(week) {
  if (week <= 2) return "Adaptation";
  if (week <= 4) return "Strength";
  if (week <= 6) return "Hypertrophy/Endurance";
  return "Deload/Retest";
}

function phaseMilestones(totalWeeks) {
  // anchor at the ends of phases (2, 4, 6) and final week
  const anchors = new Set([2, 4, 6, totalWeeks]);
  const list = [];
  anchors.forEach((wk) => {
    if (wk >= 1 && wk <= totalWeeks) {
      list.push({
        week: wk,
        title: `${phaseForWeek(wk)} phase reached`,
        body: `You’ve arrived at ${phaseForWeek(wk)} around week ${wk}. Adjust focus and keep quality high.`,
        type: "phase"
      });
    }
  });
  return list.sort((a, b) => a.week - b.week);
}

function progressMilestones(current, target, totalWeeks) {
  const diff = Math.abs((current ?? 0) - (target ?? 0));
  if (!diff || diff === 0) return [];

  // 25/50/75% checkpoints mapped across totalWeeks
  const checkpoints = [0.25, 0.5, 0.75, 1.0];
  const list = checkpoints.map((p) => {
    const wk = Math.max(1, Math.min(totalWeeks, Math.round(totalWeeks * p)));
    const pct = Math.round(p * 100);
    const type = p === 1.0 ? "goal" : "progress";
    return {
      week: wk,
      title: type === "goal" ? "Target reached!" : `${pct}% milestone`,
      body:
        type === "goal"
          ? "You’ve completed the planned journey—time to reassess, deload, and set your next cycle."
          : `You’re ~${pct}% through your plan. Keep consistency, keep logging.`,
      type
    };
  });

  // ensure uniqueness by week
  const seen = new Set();
  return list.filter((m) => {
    const k = String(m.week);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

exports.buildMilestones = (userProfile, totalWeeks) => {
  const current = userProfile.physicalMetrics.currentWeightKg;
  const target = userProfile.physicalMetrics.targetWeightKg;
  const phases = phaseMilestones(totalWeeks);
  const progress = progressMilestones(current, target, totalWeeks);
  // merge & sort
  return [...phases, ...progress].sort((a, b) => a.week - b.week);
};
