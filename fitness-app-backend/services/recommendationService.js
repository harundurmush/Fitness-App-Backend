// services/recommendationService.js

exports.recommendPlans = (userProfile) => {
  const { mainGoal, focusArea } = userProfile.basicInfo;
  const { fitnessLevel } = userProfile.fitnessAssessment;
  const { location, injuries } = userProfile.workoutPreferences || {};

  const recs = [];

  // Ana hedefe göre öneri
  if (mainGoal === 'weight_loss') {
    recs.push({
      title: 'Yağ Yakım ve Kondisyon Planı',
      description: 'Düşük-orta yoğunluklu kardiyo + direnç antrenmanları ile yağ yakımına odaklanır.',
      reason: 'Hedefin kilo kaybı olduğu için haftada 3-5 gün tempolu bir plan uygundur.'
    });
  } else if (mainGoal === 'muscle_gain') {
    recs.push({
      title: 'Kas Kütlesi Arttırma Planı',
      description: 'Hipertrofi odaklı antrenmanlarla kas hacmini artırır.',
      reason: 'Amacın kas gelişimi olduğu için progresif yüklenme prensibi uygulanır.'
    });
  } else {
    recs.push({
      title: 'Form Koruma & Genel Fitness Planı',
      description: 'Tüm vücut egzersizleri ile formun korunmasına odaklanır.',
      reason: 'Hedefin formu korumak olduğu için dengeli bir rutin önerildi.'
    });
  }

  // Seviye ve lokasyona göre öneri
  if (fitnessLevel === 'beginner') {
    recs.push({
      title: 'Başlangıç Seviyesi Plan',
      description: 'Temel hareketlerle form kazanımını ve sakatlanma riskini azaltır.',
      reason: 'Henüz yeni başladığın için hareketlerin temeli üzerine odaklanıyoruz.'
    });
  } else if (fitnessLevel === 'advanced') {
    recs.push({
      title: 'İleri Düzey Performans Planı',
      description: 'Yüksek yoğunluklu, kompleks hareketler ve periodizasyon içerir.',
      reason: 'Yüksek deneyim seviyen var, daha zorlu egzersizler uygulanabilir.'
    });
  }

  // Odak bölgeye göre öneri
  if (focusArea && focusArea.toLowerCase() === 'legs') {
    recs.push({
      title: 'Alt Vücut Güç Planı',
      description: 'Bacak ve kalça kaslarını güçlendirmeye odaklanır.',
      reason: 'Odak alanın alt vücut olduğu için bu bölgeye özel program önerildi.'
    });
  } else if (focusArea && focusArea.toLowerCase() === 'core') {
    recs.push({
      title: 'Core & Stabilizasyon Planı',
      description: 'Karın ve bel bölgesi güçlendirilerek postür ve dengeyi artırır.',
      reason: 'Odak alanın core olduğu için merkez bölge kuvvetlendirilir.'
    });
  }

  // Yaralanma durumuna göre öneri
  if (injuries && injuries.includes('knee')) {
    recs.push({
      title: 'Diz Dostu Egzersiz Planı',
      description: 'Diz eklemlerine yük bindirmeden güçlenmeni sağlar.',
      reason: 'Diz yaralanma geçmişin olduğu için düşük darbeli hareketler tercih edildi.'
    });
  }

  return recs;
};
