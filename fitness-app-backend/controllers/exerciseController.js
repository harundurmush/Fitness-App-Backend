// controllers/exerciseController.js
const { searchExercises, getExerciseById } = require('../services/exerciseService');

exports.listExercises = async (req, res) => {
  try {
    const { q, muscle, equipment, environment, risk, limit, page, sort } = req.query;
    const data = await searchExercises({ q, muscle, equipment, environment, risk, limit, page, sort });
    return res.status(200).json(data);
  } catch (err) {
    console.error('listExercises error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const ex = await getExerciseById(id);
    if (!ex) return res.status(404).json({ error: 'Exercise not found' });
    return res.status(200).json(ex);
  } catch (err) {
    console.error('getExercise error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
