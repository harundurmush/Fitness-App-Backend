// controllers/logController.js
const Plan = require('../models/planModel');
const WorkoutLog = require('../models/workoutLogModel');
const { computeTodayView } = require('../services/scheduleService');

// --- küçük yardımcılar ---
function getUserId(req) {
  return (
    req.header('x-user-id') ||
    (req.body && req.body.userId) ||
    (req.query && req.query.userId) ||
    null
  );
}

// EN/TR isim -> ISO 1..7 map (scheduleService ile tutarlı)
const DAY_TO_ISO = {
  'monday': 1, 'mon': 1, 'pazartesi': 1, 'pzt': 1,
  'tuesday': 2, 'tue': 2, 'tues': 2, 'salı': 2, 'sali': 2, 'sal': 2,
  'wednesday': 3, 'wed': 3, 'çarşamba': 3, 'carsamba': 3, 'çar': 3, 'car': 3,
  'thursday': 4, 'thu': 4, 'thurs': 4, 'perşembe': 4, 'persembe': 4, 'per': 4,
  'friday': 5, 'fri': 5, 'cuma': 5, 'cum': 5,
  'saturday': 6, 'sat': 6, 'cumartesi': 6, 'cmt': 6,
  'sunday': 7, 'sun': 7, 'pazar': 7, 'paz': 7
};
function dayNameToIso(name) {
  if (!name) return null;
  const key = String(name).trim().toLowerCase();
  return DAY_TO_ISO[key] || null;
}

// scheduleService içindeki weekday hesaplarına paralel bir yardımcı:
function isoToEnglishLong(iso) {
  return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][iso - 1];
}

// ISO günü üretmek için (TZ’de günün uzun adı -> ISO)
function weekdayIso(date, tz = 'Europe/Istanbul') {
  const longName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: tz }).format(date);
  return dayNameToIso(longName);
}

// --- LOG OLUŞTUR / GÜNCELLE ---
// POST /api/logs
// Body: { planId, date?: "YYYY-MM-DD", completed?, notes?, exercises?: [{ name, performedSets: [...] }] }
exports.upsertLog = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId is required (x-user-id header or body/query)' });

    const { planId } = req.body || {};
    if (!planId) return res.status(400).json({ error: 'planId is required in body' });

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.userId !== userId) return res.status(403).json({ error: 'Forbidden: plan does not belong to you' });

    const tz = plan.meta?.timezone || 'Europe/Istanbul';
    const dateStr = req.body.date; // optional
    const date = dateStr ? new Date(dateStr) : new Date();

    // Günün planını çıkar (faz/egzersiz hedefleri vs)
    const todayView = computeTodayView(plan, date);
    if (todayView.status !== 'ok') {
      // Rest day vb. durumlarda da log’a izin verebiliriz, ama uyarı dönelim:
      if (todayView.status === 'rest') {
        // rest gününde boş bir log oluşturmak isteyenler için yine upsert yaparız
      } else {
        return res.status(400).json({ error: 'Today view not available for this date', todayView });
      }
    }

    // hedefleri hazırla (plan gününden)
    let targetExercises = [];
    if (todayView.status === 'ok') {
      targetExercises = (todayView.exercises || []).map(ex => ({
        name: ex.name,
        targetSets: ex.sets,
        targetReps: ex.reps,
        targetRest: ex.rest,
        performedSets: []
      }));
    }

    // iso ve week hesapları
    const iso = weekdayIso(date, tz) || 1;
    const dayName = todayView.dayName || isoToEnglishLong(iso);
    const week = todayView.currentWeek || 1;

    // upsert filtre
    const key = {
      userId,
      planId,
      // Aynı günü uniqlemek için (aynı yöntemle normalize ediliyor)
      date: new Date(new Date(date).setUTCHours(0,0,0,0))
    };

    // mevcut varsa merge; yoksa oluştur
    const update = {
      $setOnInsert: {
        timezone: tz,
        week,
        dayIso: iso,
        dayName
      },
      $set: {
        completed: !!req.body.completed,
        notes: req.body.notes || ''
      }
    };

    // Egzersiz performedSets merge mantığı:
    // Kullanıcıdan gelen exercises varsa performedSets’i update ediyoruz.
    // name üzerinden eşleştiriyoruz.
    if (Array.isArray(req.body.exercises)) {
      const incoming = req.body.exercises;
      // Önce mevcut/target listesi (yoksa boş)
      const baseList = targetExercises.length ? targetExercises : [];

      // isim -> index haritası
      const map = new Map();
      baseList.forEach((e, i) => map.set(e.name.toLowerCase(), i));

      // kopya al
      const merged = baseList.map(e => ({ ...e, performedSets: e.performedSets ? [...e.performedSets] : [] }));

      incoming.forEach(inc => {
        const key = String(inc.name || '').toLowerCase();
        const idx = map.has(key) ? map.get(key) : -1;
        const perf = Array.isArray(inc.performedSets) ? inc.performedSets : [];

        if (idx === -1) {
          // planda olmayan ama kullanıcı eklemiş → ekleyelim
          merged.push({
            name: inc.name,
            targetSets: inc.targetSets || 0,
            targetReps: inc.targetReps || 0,
            targetRest: inc.targetRest || '',
            performedSets: perf
          });
        } else {
          // plandaki egzersize gelen performedSets’i yaz
          merged[idx].performedSets = perf;
          // İstersek target’ları da override edebilir (opsiyonel)
          if (typeof inc.targetSets === 'number') merged[idx].targetSets = inc.targetSets;
          if (typeof inc.targetReps === 'number') merged[idx].targetReps = inc.targetReps;
          if (typeof inc.targetRest === 'string') merged[idx].targetRest = inc.targetRest;
        }
      });

      update.$set.exercises = merged;
    } else if (targetExercises.length) {
      // Kullanıcı performedSets göndermediyse, o günün hedef listesi ile init edelim
      update.$set.exercises = targetExercises;
    }

    const opts = { upsert: true, new: true, setDefaultsOnInsert: true };
    const doc = await WorkoutLog.findOneAndUpdate(key, update, opts);

    return res.status(200).json({
      message: 'Log saved',
      log: doc
    });
  } catch (err) {
    console.error('upsertLog error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// --- BUGÜNÜ GETİR ---
// GET /api/logs/today?planId=...&date=YYYY-MM-DD
exports.getTodayLog = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId is required (x-user-id header or ?userId=...)' });

    const { planId } = req.query;
    if (!planId) return res.status(400).json({ error: 'planId is required' });

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.userId !== userId) return res.status(403).json({ error: 'Forbidden: plan does not belong to you' });

    const dateStr = req.query.date;
    const date = dateStr ? new Date(dateStr) : new Date();

    const tz = plan.meta?.timezone || 'Europe/Istanbul';
    const keyDate = new Date(new Date(date).setUTCHours(0,0,0,0));

    // Önce planın bugünkü görünümü
    const view = computeTodayView(plan, date);

    // Log var mı?
    const log = await WorkoutLog.findOne({
      userId,
      planId,
      date: keyDate
    });

    return res.status(200).json({
      todayView: view,
      log
    });
  } catch (err) {
    console.error('getTodayLog error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// --- LİSTELEME ---
// GET /api/logs?planId=...&week=... (opsiyonel: page/limit, dateFrom/dateTo)
exports.listLogs = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const { planId } = req.query;
    if (!planId) return res.status(400).json({ error: 'planId is required' });

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    if (plan.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const q = { userId, planId };

    if (req.query.week) {
      const w = Number(req.query.week);
      if (!Number.isNaN(w)) q.week = w;
    }

    // tarih aralığı
    const from = req.query.dateFrom ? new Date(req.query.dateFrom) : null;
    const to = req.query.dateTo ? new Date(req.query.dateTo) : null;
    if (from || to) {
      q.date = {};
      if (from && !isNaN(from)) q.date.$gte = new Date(new Date(from).setUTCHours(0,0,0,0));
      if (to && !isNaN(to)) {
        const end = new Date(new Date(to).setUTCHours(23,59,59,999));
        q.date.$lte = end;
      }
    }

    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      WorkoutLog.find(q).sort({ date: -1 }).skip(skip).limit(limit),
      WorkoutLog.countDocuments(q)
    ]);

    return res.status(200).json({ page, limit, total, items });
  } catch (err) {
    console.error('listLogs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
