// controllers/recommendationController.js
const { recommendPlans } = require('../services/recommendationService');

exports.getRecommendations = (req, res) => {
  try {
    // Profil verisini query veya body’den alabiliriz
    const userProfile = req.body && Object.keys(req.body).length > 0
      ? req.body
      : req.query;

    if (!userProfile || !userProfile.basicInfo || !userProfile.fitnessAssessment) {
      return res.status(400).json({ error: 'basicInfo ve fitnessAssessment bilgileri gerekli' });
    }

    const recommendations = recommendPlans(userProfile);
    return res.status(200).json({ recommendations });
  } catch (err) {
    console.error('getRecommendations error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
