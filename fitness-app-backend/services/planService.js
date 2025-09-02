// --- Existing Functions (kept as-is) ---
exports.calculatePlanDuration = (currentWeight, targetWeight, frequencyPerWeek, goalType) => {
  const weightDiff = Math.abs(currentWeight - targetWeight);

  const safeLossPerWeek = 0.75; // kg/week
  const safeGainPerWeek = 0.375; // kg/week

  const frequencyMultiplier = {
    3: 0.7,
    5: 1.0,
    7: 1.3
  };

  let baseWeeks;

  if (goalType === 'weight_loss') {
    baseWeeks = weightDiff / safeLossPerWeek;
  } else if (goalType === 'muscle_gain') {
    baseWeeks = weightDiff / safeGainPerWeek;
  } else {
    baseWeeks = 8;
  }

  return Math.ceil(baseWeeks / (frequencyMultiplier[frequencyPerWeek] || 1));
};

exports.selectExercises = (userProfile) => {
  const level = userProfile.fitnessAssessment.fitnessLevel;
  const location = userProfile.workoutPreferences.location;

  // --- Simple pool kept for backward-compatibility (focus: chest only) ---
  const exercisePool = {
    chest: {
      home: {
        beginner: ['Knee push-ups', 'Wall push-ups'],
        intermediate: ['Standard push-ups', 'Incline push-ups'],
        advanced: ['Archer push-ups', 'Pike push-ups']
      },
      gym: {
        beginner: ['Chest press machine', 'Pec deck'],
        intermediate: ['Barbell bench press', 'Dumbbell press'],
        advanced: ['Decline bench press', 'Weighted dips']
      },
      outdoor: {
        beginner: ['Incline push-ups (bench/park)', 'Wall push-ups'],
        intermediate: ['Standard push-ups', 'Dips (parallel bars)'],
        advanced: ['Clapping push-ups', 'Explosive incline push-ups']
      }
    }
  };

  // --- Injury adaptations used in this simple selector ---
  const injuryAdaptations = {
    knee: {
      avoid: ['Jump Rope', 'Sprints', 'Squats', 'Step-ups'],
      alternatives: {
        'Jump Rope': 'Seated Battle Rope',
        'Sprints': 'Seated Arm Ergometer',
        'Squats': 'Glute Bridge',
        'Step-ups': 'Seated Leg Extensions'
      }
    },
    shoulder: {
      avoid: ['Overhead Press', 'Push-ups', 'Pull-ups (Bar)'],
      alternatives: {
        'Overhead Press': 'Front Raise (Light Dumbbell)',
        'Push-ups': 'Wall Push-ups',
        'Pull-ups (Bar)': 'Band Assisted Rows'
      }
    },
    lower_back: {
      avoid: ['Deadlift', 'Cable Rows', 'Towel Rows'],
      alternatives: {
        'Deadlift': 'Hip Thrust',
        'Cable Rows': 'Chest Supported Rows',
        'Towel Rows': 'Resistance Band Rows'
      }
    }
  };

  const focusArea = userProfile.basicInfo.focusArea || 'chest';
  const area = focusArea.toLowerCase();

  let exercisesByLocation = exercisePool[area]?.[location] || exercisePool.chest[location];
  let selectedExercises = exercisesByLocation[userProfile.fitnessAssessment.fitnessLevel] || exercisesByLocation['beginner'];

  if (userProfile.workoutPreferences.injuries?.length > 0) {
    userProfile.workoutPreferences.injuries.forEach((injury) => {
      if (injuryAdaptations[injury]) {
        const { avoid, alternatives } = injuryAdaptations[injury];
        selectedExercises = selectedExercises.map(ex =>
          avoid.includes(ex) ? (alternatives[ex] || ex) : ex
        );
      }
    });
  }

  return selectedExercises.map(name => ({
    name,
    sets: 3,
    reps: 12,
    rest: '60s'
  }));
};

// --- Helpers: phases, schemes, rotation ---
function getPhaseForWeek(week) {
  if (week <= 2) return 'adaptation';
  if (week <= 4) return 'strength';
  if (week <= 6) return 'hypertrophy';
  return 'deload';
}

function getScheme(level, phase) {
  const base = {
    adaptation: { sets: 2, reps: 10, rest: '60s' },
    strength:   { sets: 4, reps: 5,  rest: '120s' },
    hypertrophy:{ sets: 4, reps: 10, rest: '90s' },
    deload:     { sets: 2, reps: 8,  rest: '90s' }
  };

  const mod = {
    beginner:     { addSets: 0, repAdj: 0 },
    intermediate: { addSets: 1, repAdj: 0 },
    advanced:     { addSets: 2, repAdj: 0 }
  };

  const b = base[phase];
  const m = mod[level] || mod.beginner;

  return {
    sets: Math.max(1, b.sets + m.addSets),
    reps: b.reps + m.repAdj,
    rest: b.rest
  };
}

function rotationIndexForWeek(week) {
  // 2-week rotations: 1-2 -> 0, 3-4 -> 1, 5-6 -> 2, ...
  return Math.floor((week - 1) / 2);
}

function applyInjuryAdaptations(names, injuries, table) {
  if (!injuries || injuries.length === 0) return names;
  let out = [...names];
  injuries.forEach(injury => {
    const cfg = table[injury];
    if (!cfg) return;
    const { avoid = [], alternatives = {} } = cfg;
    out = out.map(n => (avoid.includes(n) ? (alternatives[n] || n) : n));
  });
  return out;
}

function withScheme(names, scheme) {
  return names.map(name => ({ name, sets: scheme.sets, reps: scheme.reps, rest: scheme.rest }));
}

// --- Day/ISO helpers (EN + TR destekli) ---
const DAY_TO_ISO = {
  // Monday
  'monday': 1, 'mon': 1, 'pazartesi': 1, 'pzt': 1,
  // Tuesday
  'tuesday': 2, 'tue': 2, 'tues': 2, 'salı': 2, 'sali': 2, 'sal': 2,
  // Wednesday
  'wednesday': 3, 'wed': 3, 'çarşamba': 3, 'carsamba': 3, 'çar': 3, 'car': 3,
  // Thursday
  'thursday': 4, 'thu': 4, 'thurs': 4, 'perşembe': 4, 'persembe': 4, 'per': 4,
  // Friday
  'friday': 5, 'fri': 5, 'cuma': 5, 'cum': 5,
  // Saturday
  'saturday': 6, 'sat': 6, 'cumartesi': 6, 'cmt': 6,
  // Sunday
  'sunday': 7, 'sun': 7, 'pazar': 7, 'paz': 7
};
const EN_LONG = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function dayNameToIso(name) {
  if (!name) return null;
  const key = String(name).trim().toLowerCase();
  return DAY_TO_ISO[key] || null;
}
function isoToEnglishLong(iso) {
  return EN_LONG[iso - 1];
}

// --- Rich exercise matrix with 2-week rotations ---
const exerciseMatrix = {
  chest: {
    home: {
      beginner: [
        ['Wall push-ups', 'Knee push-ups', 'Chair dips'],
        ['Incline push-ups (table)', 'Towel rows', 'Plank']
      ],
      intermediate: [
        ['Standard push-ups', 'Chair dips', 'Towel rows'],
        ['Decline push-ups', 'Diamond push-ups', 'Side plank']
      ],
      advanced: [
        ['Archer push-ups', 'Explosive push-ups', 'Feet-elevated push-ups'],
        ['Pseudo planche push-ups', 'Ring dips (if available)', 'L‑sit hold (chair)']
      ]
    },
    gym: {
      beginner: [
        ['Chest press machine', 'Pec deck', 'Seated row'],
        ['Incline machine press', 'Cable fly', 'Lat pulldown']
      ],
      intermediate: [
        ['Barbell bench press', 'Dumbbell press', 'Cable row'],
        ['Incline dumbbell press', 'Weighted push-ups', 'Chest supported row']
      ],
      advanced: [
        ['Bench press (heavy)', 'Weighted dips', 'T‑bar row'],
        ['Incline barbell press', 'Chain/band press', 'Chest supported row (heavy)']
      ]
    },
    outdoor: {
      beginner: [
        ['Wall push-ups', 'Incline push-ups (bench/park)', 'Band rows (if available)'],
        ['Parallel bar dips (assisted)', 'Standard push-ups', 'Plank']
      ],
      intermediate: [
        ['Standard push-ups', 'Dips (parallel bars)', 'Inverted rows (bar)'],
        ['Decline push-ups (bench)', 'Wide push-ups', 'Hollow hold']
      ],
      advanced: [
        ['Clapping push-ups', 'Explosive incline push-ups', 'Inverted rows feet elevated'],
        ['Archer push-ups', 'Ring dips (if available)', 'Russian dips']
      ]
    }
  },

  // NEW: BACK
  back: {
    home: {
      beginner: [
        ['Towel rows', 'Reverse snow angels', 'Supermans'],
        ['Backpack rows', 'Doorframe rows (caution)', 'Bird-dog']
      ],
      intermediate: [
        ['Backpack bent-over rows', 'Hip hinge (tempo)', 'Prone Y‑T‑W raises'],
        ['Inverted rows (sturdy table)', 'Good mornings (light backpack)', 'Supermans (hold)']
      ],
      advanced: [
        ['Inverted rows feet elevated', 'Backpack deadlift (caution)', 'Archer rows (band/table)'],
        ['Single-arm backpack rows', 'Slow eccentrics rows', 'Long lever supermans']
      ]
    },
    gym: {
      beginner: [
        ['Lat pulldown', 'Seated cable row', 'Back extension (light)'],
        ['Machine row', 'Straight-arm pulldown', 'Face pulls (light)']
      ],
      intermediate: [
        ['Barbell row', 'Cable row', 'Lat pulldown (wide)'],
        ['Chest supported row', 'Single-arm dumbbell row', 'Face pulls']
      ],
      advanced: [
        ['Deadlift (moderate-heavy)', 'T‑bar row', 'Weighted pull-ups'],
        ['Pendlay row', 'Chest supported row (heavy)', 'Lat pulldown heavy sets']
      ]
    },
    outdoor: {
      beginner: [
        ['Inverted rows (bar)', 'Scapular pull-ups', 'Supermans'],
        ['Australian pull-ups (low bar)', 'Band rows (if available)', 'Face pulls (band)']
      ],
      intermediate: [
        ['Pull-ups', 'Inverted rows feet forward', 'Chin-ups'],
        ['Wide-grip pull-ups', 'Close-grip chin-ups', 'Hollow body holds']
      ],
      advanced: [
        ['Weighted pull-ups (if safe)', 'Archer pull-ups', 'Explosive pull-ups (caution)'],
        ['Typewriter pull-ups', 'One-arm assisted pull-ups', 'L‑sit pull-ups']
      ]
    }
  },

  // NEW: ARMS
  arms: {
    home: {
      beginner: [
        ['Chair dips', 'Diamond push-ups (knees)', 'Towel curls (backpack)'],
        ['Bench dips (assisted)', 'Close‑grip push-ups (incline)', 'Isometric biceps holds (towel)']
      ],
      intermediate: [
        ['Diamond push-ups', 'Bench dips', 'Backpack curls'],
        ['Close‑grip push-ups', 'Towel hammer curls', 'Overhead towel extensions']
      ],
      advanced: [
        ['Feet‑elevated close‑grip push-ups', 'Bench dips (deep, careful)', 'Backpack curls (heavy)'],
        ['Pseudo planche push-ups (close)', 'Towel drag curls (slow ecc.)', 'One‑arm bench dips (assisted)']
      ]
    },
    gym: {
      beginner: [
        ['Cable triceps pushdown', 'EZ‑bar curls (light)', 'Rope hammer curls'],
        ['Seated dumbbell curls', 'Overhead rope extensions', 'Machine dips (light)']
      ],
      intermediate: [
        ['Close‑grip bench press', 'Barbell curls', 'Skull crushers'],
        ['Alternating DB curls', 'Cable pushdowns', 'Incline DB curls']
      ],
      advanced: [
        ['Weighted dips', 'Heavy barbell curls', 'Overhead EZ extensions'],
        ['JM press', 'Preacher curls (heavy)', 'Cable pushdowns (heavy)']
      ]
    },
    outdoor: {
      beginner: [
        ['Parallel bar dips (assisted)', 'Close‑grip push-ups (bench)', 'Band curls (if available)'],
        ['Bench/park dips', 'Incline close‑grip push-ups', 'Isometric curl holds (band/towel)']
      ],
      intermediate: [
        ['Dips (parallel bars)', 'Chin-ups', 'Close‑grip push-ups'],
        ['Inverted rows (underhand grip)', 'Band curls/pressdowns', 'Diamond push-ups']
      ],
      advanced: [
        ['Weighted dips', 'Chin-ups (weighted if safe)', 'Ring curls (if available)'],
        ['Explosive close‑grip push-ups', 'Typewriter chin-ups', 'One‑arm assisted dips']
      ]
    }
  },

  legs: {
    home: {
      beginner: [
        ['Bodyweight squats', 'Chair-assisted lunges', 'Glute bridge'],
        ['Wall sit', 'Step-ups (chair)', 'Calf raises']
      ],
      intermediate: [
        ['Reverse lunges', 'Bulgarian split squats', 'Hip thrust (sofa)'],
        ['Tempo squats', 'Cossack squats', 'Single-leg RDL (backpack)']
      ],
      advanced: [
        ['Jump squats', 'Shrimp squats', 'Nordic ham curls (sofa)'],
        ['Pistol squats (assisted)', 'Box jumps (safe)', 'Hip thrust (heavy backpack)']
      ]
    },
    gym: {
      beginner: [
        ['Leg press', 'Leg extension', 'Seated leg curl'],
        ['Goblet squat', 'Hip thrust', 'Calf raise machine']
      ],
      intermediate: [
        ['Back squat', 'Romanian deadlift', 'Walking lunges'],
        ['Front squat', 'Hip thrust (barbell)', 'Leg curl']
      ],
      advanced: [
        ['Back squat (heavy singles)', 'RDL (heavy)', 'Split squats (heavy)'],
        ['Olympic lifts technique', 'Box jumps', 'Hip thrust (heavy)']
      ]
    },
    outdoor: {
      beginner: [
        ['Step-ups (bench/park)', 'Walking lunges', 'Glute bridge'],
        ['Hill walks', 'Calf raises (stairs)', 'Side lunges']
      ],
      intermediate: [
        ['Sprints (short)', 'Stair climbs', 'Broad jumps'],
        ['Tempo runs', 'Walking lunges (long)', 'Single-leg bridge']
      ],
      advanced: [
        ['Hill sprints', 'Depth jumps (safe)', 'Plyo lunges'],
        ['Stair sprints', 'Bounding', 'Single-leg hops (caution)']
      ]
    }
  },
  core: {
    home: {
      beginner: [
        ['Plank', 'Dead bug', 'Side plank (knees)'],
        ['Bird-dog', 'Glute bridge', 'Hollow hold (easy)']
      ],
      intermediate: [
        ['Hollow hold', 'Side plank', 'Mountain climbers'],
        ['V‑ups', 'Plank shoulder taps', 'Reverse crunches']
      ],
      advanced: [
        ['Hanging knee raises (bar/doorframe)', 'Dragon flag (progression)', 'L‑sit (chair)'],
        ['Ab wheel (if available)', 'Long lever plank', 'V‑tucks']
      ]
    },
    gym: {
      beginner: [
        ['Cable pallof press', 'Swiss ball crunch', 'Back extension (light)'],
        ['Plank', 'Dead bug', 'Side plank']
      ],
      intermediate: [
        ['Hanging knee raises', 'Cable crunch', 'Back extension'],
        ['Weighted planks', 'Reverse crunch', 'Pallof press']
      ],
      advanced: [
        ['Toes to bar', 'Dragon flag', 'Weighted cable crunch'],
        ['Hanging leg raises', 'GHD sit-ups (careful)', 'Heavy back extension']
      ]
    },
    outdoor: {
      beginner: [
        ['Plank', 'Dead bug', 'Side plank'],
        ['Hollow hold (easy)', 'Glute bridge', 'Mountain climbers']
      ],
      intermediate: [
        ['Hanging knee raises (park bar)', 'V‑ups', 'Side plank'],
        ['Leg raises (bar)', 'Hollow body rocks', 'Bicycle crunch']
      ],
      advanced: [
        ['Toes to bar (park)', 'Dragon flag (bench)', 'Long lever plank'],
        ['L‑sit (parallel bars)', 'Hanging leg raises', 'Windshield wipers']
      ]
    }
  }
};

// Injury adaptations table for advanced plan builder
const injuryAdaptationsTable = {
  knee: {
    avoid: ['Jump squats', 'Plyo lunges', 'Depth jumps', 'Hill sprints', 'Sprints (short)', 'Stair sprints', 'Broad jumps'],
    alternatives: {
      'Jump squats': 'Tempo squats',
      'Plyo lunges': 'Reverse lunges',
      'Depth jumps': 'Box step-ups',
      'Hill sprints': 'Incline brisk walk',
      'Sprints (short)': 'Tempo runs (moderate)',
      'Stair sprints': 'Stair climbs (steady)',
      'Broad jumps': 'Step-ups (bench/park)'
    }
  },
  shoulder: {
    avoid: ['Overhead press', 'Weighted dips', 'Ring dips (if available)', 'Russian dips', 'Push-ups (advanced variations)'],
    alternatives: {
      'Overhead press': 'Front raises (light)',
      'Weighted dips': 'Bench dips (partial)',
      'Ring dips (if available)': 'Parallel bar support hold',
      'Russian dips': 'Bench dips (assisted)',
      'Push-ups (advanced variations)': 'Wall push-ups'
    }
  },
  lower_back: {
    avoid: ['Romanian deadlift', 'Good mornings', 'Back extension (heavy)', 'Dragon flag (full)'],
    alternatives: {
      'Romanian deadlift': 'Hip thrust',
      'Good mornings': 'Glute bridge',
      'Back extension (heavy)': 'Back extension (light)',
      'Dragon flag (full)': 'Dragon flag (progression)'
    }
  }
};

// Day templates & helpers
function pickPrimaryArea(focusArea) {
  const map = { chest: 'chest', arms: 'arms', abs: 'core', legs: 'legs', full_body: 'chest', back: 'back', core: 'core' };
  return map[(focusArea || '').toLowerCase()] || 'chest';
}

// FULL names for mapping (template default)
function dayNamesForFrequency(freq) {
  if (freq === 3) return ['Monday', 'Wednesday', 'Friday'];
  if (freq === 5) return ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'];
  return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']; // 7
}

// Map specificDays (TR/EN mix) to ISO order; if empty -> defaults from frequency
function resolveActiveIsoOrder(freq, specificDays) {
  const base = (Array.isArray(specificDays) && specificDays.length > 0)
    ? specificDays
    : dayNamesForFrequency(freq);
  const seen = new Set();
  const out = [];
  base.forEach(d => {
    const iso = dayNameToIso(d);
    if (iso && !seen.has(iso)) { seen.add(iso); out.push(iso); }
  });
  return out;
}

function buildDayTemplate(freq, focusArea) {
  const primary = pickPrimaryArea(focusArea);
  if (freq === 3) {
    return [
      [primary, 'legs', 'core'],
      [primary, 'core'],
      ['legs', 'core']
    ];
  }
  if (freq === 5) {
    return [
      [primary, 'core'],
      ['legs', 'core'],
      [primary, 'core'],
      ['back', 'core'],
      ['arms', 'core']
    ];
  }
  // 7 days
  return [
    [primary], ['legs'], ['core'], ['back'], ['arms'], ['core'], [primary]
  ];
}

// IMPORTANT: remove fallback — if area not defined, return null
function resolveArea(area) {
  return exerciseMatrix[area] ? area : null;
}

// --- Advanced multi-week plan builder ---
exports.buildPersonalPlan = (userProfile, totalWeeks) => {
  const { location, frequencyPerWeek, injuries, specificDays } = userProfile.workoutPreferences;
  const level = userProfile.fitnessAssessment.fitnessLevel;
  const focusArea = userProfile.basicInfo.focusArea || 'chest';

  const template = buildDayTemplate(frequencyPerWeek, focusArea);

  // ACTIVE DAY ORDER (ISO) — schedule ile %100 uyum
  const activeIso = resolveActiveIsoOrder(frequencyPerWeek, specificDays);

  const weeks = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const phase = getPhaseForWeek(w);
    const scheme = getScheme(level, phase);
    const rot = rotationIndexForWeek(w); // 0,1,2...

    const days = template.map((areas, idx) => {
      const blocks = areas
        .map(rawArea => {
          const area = resolveArea(rawArea);
          if (!area) return []; // unknown area -> skip
          const matrix = exerciseMatrix[area]?.[location]?.[level] || [];
          const rotationSet = matrix.length ? matrix[rot % matrix.length] : [];
          const adaptedNames = applyInjuryAdaptations(rotationSet, injuries, injuryAdaptationsTable);
          return withScheme(adaptedNames, scheme);
        });

      const flat = blocks.flat();
      const dayExercises = flat.slice(0, Math.min(6, Math.max(3, flat.length)));

      // ISO ve etiket ataması — ISO dizisi template uzunluğuna göre indekslenir
      const dayIso = activeIso[idx] || ((idx % 7) + 1); // safety fallback
      const dayName = isoToEnglishLong(dayIso);

      return {
        dayIso,
        dayName,
        phase,
        exercises: dayExercises
      };
    });

    weeks.push({ week: w, phase, days });
  }

  return {
    totalWeeks,
    progression: [
      'Week 1-2: Adaptation',
      'Week 3-4: Strength',
      'Week 5-6: Hypertrophy/Endurance',
      'Week 7-8: Deload/Retest'
    ],
    weeks
  };
};
