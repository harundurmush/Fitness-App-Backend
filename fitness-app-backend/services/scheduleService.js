// services/scheduleService.js

// Map frequences to default day names used by plan builder (FULL NAMES)
function dayNamesForFrequency(freq) {
  if (freq === 3) return ['Monday', 'Wednesday', 'Friday'];
  if (freq === 5) return ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'];
  return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
}

// --- Day name normalization to ISO DOW (1..7) ---
// EN + TR, uzun + kısa formlar
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

function dayNameToIso(name) {
  if (!name) return null;
  const key = String(name).trim().toLowerCase();
  return DAY_TO_ISO[key] || null;
}

const EN_LONG = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const TR_LONG = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];

function isoToEnglishLong(iso) {
  return EN_LONG[iso - 1];
}
function isoToLocalizedLong(iso, locale = 'en-US') {
  const isTR = String(locale).toLowerCase().startsWith('tr');
  return (isTR ? TR_LONG : EN_LONG)[iso - 1];
}

// --- TZ Helpers ---
function getTZDateParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = fmt.formatToParts(date).reduce((acc, p) => {
    if (p.type === 'year') acc.y = parseInt(p.value, 10);
    if (p.type === 'month') acc.m = parseInt(p.value, 10);
    if (p.type === 'day') acc.d = parseInt(p.value, 10);
    return acc;
  }, { y: 1970, m: 1, d: 1 });
  return parts;
}

function tzMidnight(date, timeZone) {
  const { y, m, d } = getTZDateParts(date, timeZone);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

// Convert JS Date to weekday (English long) in given TZ, then to ISO 1..7
function weekdayIso(date, tz = 'Europe/Istanbul') {
  const longName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: tz }).format(date);
  return dayNameToIso(longName);
}

// Build active ISO list from specificDays OR defaults
function activeIsoDays(freq, specificDays) {
  const base = (Array.isArray(specificDays) && specificDays.length > 0)
    ? specificDays
    : dayNamesForFrequency(freq);
  const seen = new Set();
  const out = [];
  base.forEach(d => {
    const iso = dayNameToIso(d);
    if (iso && !seen.has(iso)) {
      seen.add(iso);
      out.push(iso);
    }
  });
  return out;
}

// Try to resolve a day block by ISO (preferred). Fallback: by index in active order.
function findDayBlockByIsoOrIndex(weekBlock, isoToday, activeOrder, indexInActive) {
  const days = Array.isArray(weekBlock?.days) ? weekBlock.days : [];
  if (!days.length) return null;

  // 1) ISO eşleşmesi (kaydedilmiş dayName ne olursa olsun)
  for (const d of days) {
    const iso = dayNameToIso(d.dayName);
    if (iso && iso === isoToday) return d;
  }

  // 2) Index fallback (template sırası)
  return days[indexInActive] || null;
}

// Given `plan` doc and a target date, compute week/day and return "today" block
function computeTodayView(planDoc, targetDate = new Date()) {
  const tz = planDoc.meta?.timezone || 'Europe/Istanbul';
  // locale: meta.locale varsa onu kullan, yoksa Istanbul için tr-TR, değilse en-US
  const locale = planDoc.meta?.locale || (tz.includes('Istanbul') ? 'tr-TR' : 'en-US');

  const start = planDoc.meta?.startDate ? new Date(planDoc.meta.startDate) : new Date(planDoc.createdAt);

  // Normalize both to TZ midnight
  const startLocalMid = tzMidnight(start, tz);
  const todayLocalMid = tzMidnight(targetDate, tz);

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((todayLocalMid - startLocalMid) / msPerDay);

  // Before plan start
  if (diffDays < 0) {
    return {
      status: 'not_started',
      startsInDays: Math.abs(diffDays),
      message: 'Plan has not started yet for this date.'
    };
  }

  const totalWeeks = planDoc.plan?.totalWeeks || 8;
  const currentWeekNumber = Math.floor(diffDays / 7) + 1; // 1-based
  if (currentWeekNumber > totalWeeks) {
    return { status: 'completed', message: 'Plan duration is over.' };
  }

  // Training days (ISO)
  const freq = planDoc.userProfile?.workoutPreferences?.frequencyPerWeek || 3;
  const specificDays = planDoc.userProfile?.workoutPreferences?.specificDays || [];
  const activeDaysIso = activeIsoDays(freq, specificDays);

  // Today's ISO
  const isoToday = weekdayIso(todayLocalMid, tz);
  const indexInActive = activeDaysIso.indexOf(isoToday);

  // Get the week block
  const weeksArr = Array.isArray(planDoc.plan?.weeks) ? planDoc.plan.weeks : [];
  const weekBlock = weeksArr.find(w => w.week === currentWeekNumber);

  if (!weekBlock) {
    return {
      status: 'no_week_data',
      currentWeek: currentWeekNumber,
      message: 'No week data found for this date.'
    };
  }

  // Rest day?
  if (indexInActive === -1) {
    // find next training day within 7 days
    let daysAhead = null;
    for (let i = 1; i <= 7; i++) {
      const candMid = new Date(todayLocalMid.getTime() + i * msPerDay);
      const candIso = weekdayIso(candMid, tz);
      if (activeDaysIso.includes(candIso)) { daysAhead = i; break; }
    }

    return {
      status: 'rest',
      timezone: tz,
      locale,
      date: todayLocalMid,
      currentWeek: currentWeekNumber,
      phase: weekBlock.phase,
      // Görünen isim artık yerelleştirilmiş
      dayIso: isoToday,
      dayName: isoToLocalizedLong(isoToday, locale),
      dayNameEnglish: isoToEnglishLong(isoToday),
      message: 'Rest day. No scheduled workout today.',
      nextTrainingInDays: daysAhead,
      nutrition: planDoc.plan?.nutrition || null
    };
  }

  // Resolve day block
  const dayBlock = findDayBlockByIsoOrIndex(weekBlock, isoToday, activeDaysIso, indexInActive);

  // Accessories
  const nutrition = planDoc.plan?.nutrition || null;
  const motivationArr = planDoc.plan?.motivation?.messages || [];
  const motivation = motivationArr.length
    ? motivationArr[Math.min(currentWeekNumber - 1, motivationArr.length - 1)]
    : null;

  const milestonesArr = planDoc.plan?.milestones || [];
  const milestone = milestonesArr.find(m => m.week === currentWeekNumber) || null;

  // Kaydedilmiş (orijinal) isim bilgi amaçlı dönüyor, ama görünen isim ISO -> locale
  const savedName = dayBlock?.dayName || isoToEnglishLong(isoToday);

  return {
    status: 'ok',
    timezone: tz,
    locale,
    date: todayLocalMid,
    currentWeek: currentWeekNumber,
    totalWeeks,
    resolvedBy: dayNameToIso(savedName) === isoToday ? 'iso-name' : 'index',
    dayIndex: indexInActive,
    dayIso: isoToday,
    // GÖRÜNTÜLENECEK İSİM:
    dayName: isoToLocalizedLong(isoToday, locale),
    // Ek bilgi:
    dayNameEnglish: isoToEnglishLong(isoToday),
    savedDayName: savedName,
    phase: dayBlock?.phase || weekBlock.phase,
    exercises: dayBlock?.exercises || [],
    nutrition,
    motivation,
    milestone
  };
}

module.exports = {
  dayNamesForFrequency,
  computeTodayView
};
