// services/motivationService.js

/**
 * Build motivation message pack based on user's motivation source, goal and level.
 * Returns a flat string array to keep model simple.
 */

const TONES = {
  aesthetics: [
    "Every rep sculpts your future look.",
    "Consistency is the real glow-up.",
    "Tiny improvements = visible results.",
    "Posture tall, core tight—own the mirror."
  ],
  confidence: [
    "You’re showing up—confidence follows.",
    "Stack small wins; they compound.",
    "Your discipline is louder than doubt.",
    "Trust the process—you’re earning it."
  ],
  energy: [
    "Move more, feel more alive.",
    "Short bursts now, energy all day.",
    "Breathe steady—fuel your engine.",
    "Finish strong; ride the endorphins."
  ],
  health: [
    "Heart strong, mind clear—health first.",
    "Invest in longevity today.",
    "Flow, not force. Quality reps.",
    "Better habits, better markers."
  ],
  stress: [
    "Exhale the stress on every rep.",
    "One set at a time—reset.",
    "You showed up; that’s the hardest part.",
    "Train the body, quiet the mind."
  ]
};

const GOAL_SNIPPETS = {
  weight_loss: [
    "Calorie target matters—hydrate between sets.",
    "Walk 5–10 min post‑workout to boost burn.",
    "Protein at each meal supports fat loss.",
    "Sleep is fat‑loss force multiplier."
  ],
  muscle_gain: [
    "Progressive overload—record your lifts.",
    "Protein 1.6–2.2 g/kg supports growth.",
    "Quality reps > ego reps.",
    "Recover hard; muscles grow off the floor."
  ],
  maintenance: [
    "Consistency over intensity—own your baseline.",
    "Keep technique crisp; prevent setbacks.",
    "Micro‑goals keep momentum.",
    "Stay curious—vary tempos and grips."
  ]
};

const LEVEL_OPENERS = {
  beginner: "Keep it smooth and controlled—form first.",
  intermediate: "Dial in tempo and range—earn the volume.",
  advanced: "Push capacity, protect recovery—smart intensity."
};

function normalizeMotivation(source) {
  const map = {
    aesthetics: "aesthetics",
    confidence: "confidence",
    energy: "energy",
    health: "health",
    stress_relief: "stress",
    stress: "stress"
  };
  return map[(source || "").toLowerCase()] || "confidence";
}

exports.buildMotivation = (userProfile, totalWeeks) => {
  const source = normalizeMotivation(userProfile.basicInfo.motivationSource);
  const goal = (userProfile.basicInfo.mainGoal || "maintenance").toLowerCase();
  const level = (userProfile.fitnessAssessment.fitnessLevel || "beginner").toLowerCase();

  const tone = TONES[source] || TONES.confidence;
  const goalPack = GOAL_SNIPPETS[goal] || GOAL_SNIPPETS.maintenance;
  const opener = LEVEL_OPENERS[level];

  const messages = [
    opener,
    ...tone.slice(0, 4),
    ...goalPack.slice(0, 4),
    "You’re building a durable habit—show up again."
  ];

  // Expand to cover plan length (roughly 1 per week)
  const out = [];
  for (let w = 1; w <= totalWeeks; w++) {
    const pick = messages[(w - 1) % messages.length];
    out.push(`Week ${w}: ${pick}`);
  }
  return out;
};
